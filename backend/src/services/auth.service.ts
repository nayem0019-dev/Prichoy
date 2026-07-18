import { Role } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/hash';
import {
  signAccessToken, signRefreshToken,
  verifyRefreshToken, getRefreshTokenExpiryDate,
} from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logSecurityEvent } from '../config/logger';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: Role;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Generic message used for every login failure branch. Using the SAME
// message for "no such account", "wrong password", and "account locked"
// (aside from the lockout case, which necessarily reveals timing) prevents
// user enumeration — an attacker cannot tell whether an email address has
// an account at all based on the error returned.
const GENERIC_LOGIN_ERROR = 'Invalid email or password';

export class AuthService {
  async register(data: RegisterData) {
    const email = data.email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email already in use', HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await userRepository.create({
      ...data,
      email,
      password: hashedPassword,
    });

    logSecurityEvent('ADMIN_ACCOUNT_CREATED', {
      newUserId: user.id, newUserEmail: user.email, newUserRole: user.role,
    });

    // Deliberately does NOT generate or return session tokens. This
    // endpoint is called by a SUPER_ADMIN to provision a new staff
    // account, not by that account logging in for itself — issuing live,
    // usable tokens back to the caller for an identity that isn't theirs
    // would be an unnecessary credential to hand out. The new user
    // authenticates for the first time through the normal /login flow.
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(data: LoginData) {
    const email = data.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);

    // Deliberately perform a dummy bcrypt comparison even when no user is
    // found, so that the response time for "account doesn't exist" is
    // statistically indistinguishable from "account exists, wrong
    // password". Without this, an attacker can enumerate valid emails
    // purely by measuring response latency (bcrypt.compare is the slow
    // step; skipping it for non-existent users creates a timing oracle).
    if (!user) {
      await comparePassword(data.password, '$2b$12$invalidsaltinvalidsaltinvalidsalO');
      logSecurityEvent('LOGIN_FAILED', { email, reason: 'no_such_account', ip: data.ip, userAgent: data.userAgent });
      throw new AppError(GENERIC_LOGIN_ERROR, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
      logSecurityEvent('LOGIN_FAILED', { userId: user.id, email, reason: 'account_deactivated', ip: data.ip, userAgent: data.userAgent });
      throw new AppError('Account is deactivated. Contact administrator', HTTP_STATUS.FORBIDDEN);
    }

    // ── Account lockout check ─────────────────────────────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      logSecurityEvent('LOGIN_BLOCKED_ACCOUNT_LOCKED', { userId: user.id, email, ip: data.ip, userAgent: data.userAgent, minutesLeft });
      throw new AppError(
        `Account temporarily locked due to repeated failed login attempts. Try again in ${minutesLeft} minute(s).`,
        HTTP_STATUS.FORBIDDEN
      );
    }

    const passwordValid = await comparePassword(data.password, user.password);
    if (!passwordValid) {
      const updated = await userRepository.incrementFailedLogins(user.id);

      if (updated.failedLoginAttempts >= env.security.maxFailedLoginAttempts) {
        const lockUntil = new Date(Date.now() + env.security.accountLockoutMinutes * 60 * 1000);
        await userRepository.lockAccount(user.id, lockUntil);
        logSecurityEvent('ACCOUNT_LOCKED', {
          userId: user.id, email, ip: data.ip, userAgent: data.userAgent,
          failedAttempts: updated.failedLoginAttempts, lockedUntil: lockUntil,
        });
      } else {
        logSecurityEvent('LOGIN_FAILED', {
          userId: user.id, email, reason: 'wrong_password', ip: data.ip, userAgent: data.userAgent,
          failedAttempts: updated.failedLoginAttempts,
        });
      }

      throw new AppError(GENERIC_LOGIN_ERROR, HTTP_STATUS.UNAUTHORIZED);
    }

    // Successful login — reset any prior failed-attempt counter/lock.
    await userRepository.resetFailedLogins(user.id);
    await userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: data.ip,
      lastLoginUserAgent: data.userAgent,
    });

    await prisma.activityLog.create({
      data: {
        adminId: user.id,
        action: 'LOGIN',
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
    logSecurityEvent('LOGIN_SUCCESS', { userId: user.id, email, ip: data.ip, userAgent: data.userAgent });

    const tokens = this.generateTokens(user.id, user.role, user.email);
    await userRepository.saveRefreshToken(
      user.id, tokens.refreshToken, getRefreshTokenExpiryDate(),
      { ip: data.ip, userAgent: data.userAgent }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async refreshTokens(token: string, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      logSecurityEvent('REFRESH_TOKEN_INVALID', { ip: meta?.ip, userAgent: meta?.userAgent });
      throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
    }

    const stored = await userRepository.findRefreshToken(token);
    if (!stored) {
      // Token verified cryptographically but isn't in our active-token
      // store (already used/rotated, revoked, or expired at the DB
      // level). This can also indicate token replay — worth its own
      // security log entry distinct from "invalid signature".
      logSecurityEvent('REFRESH_TOKEN_REUSE_OR_REVOKED', {
        userId: payload.userId, ip: meta?.ip, userAgent: meta?.userAgent,
      });
      throw new AppError('Refresh token revoked or expired', HTTP_STATUS.UNAUTHORIZED);
    }

    if (!stored.user.isActive) {
      throw new AppError('Account is deactivated. Contact administrator', HTTP_STATUS.FORBIDDEN);
    }

    // Rotate: revoke old, issue new. Uses the DB's current role, not the
    // (potentially stale) role embedded in the presented refresh token —
    // so a role change by a SUPER_ADMIN takes effect on the very next
    // refresh cycle rather than waiting for the old refresh token to
    // expire naturally (up to 7 days later).
    await userRepository.revokeRefreshToken(token);
    const tokens = this.generateTokens(stored.user.id, stored.user.role, stored.user.email);
    await userRepository.saveRefreshToken(
      stored.user.id, tokens.refreshToken, getRefreshTokenExpiryDate(), meta
    );
    logSecurityEvent('TOKEN_REFRESHED', { userId: stored.user.id, ip: meta?.ip, userAgent: meta?.userAgent });
    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await userRepository.revokeRefreshToken(refreshToken);
    }
    await prisma.activityLog.create({
      data: { adminId: userId, action: 'LOGOUT' },
    });
    logSecurityEvent('LOGOUT', { userId });
  }

  async logoutAll(userId: string): Promise<void> {
    await userRepository.revokeAllUserTokens(userId);
    logSecurityEvent('LOGOUT_ALL_DEVICES', { userId });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      logSecurityEvent('PASSWORD_CHANGE_FAILED', { userId, reason: 'wrong_current_password' });
      throw new AppError('Current password is incorrect', HTTP_STATUS.BAD_REQUEST);
    }

    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from the current password', HTTP_STATUS.BAD_REQUEST);
    }

    const hashed = await hashPassword(newPassword);
    await userRepository.update(userId, { password: hashed });
    // Force re-authentication everywhere — a changed password should
    // immediately invalidate every existing session, not just the one
    // that initiated the change.
    await userRepository.revokeAllUserTokens(userId);
    logSecurityEvent('PASSWORD_CHANGED', { userId });
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    const { password: _, ...safe } = user;
    return safe;
  }

  private generateTokens(userId: string, role: Role, email: string): TokenPair {
    const payload = { userId, role, email };
    return {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }
}

export const authService = new AuthService();
