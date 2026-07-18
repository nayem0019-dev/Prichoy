import { prisma } from '../config/database';
import { User, Role } from '@prisma/client';
import { hashToken } from '../utils/hash';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    // Callers are expected to have already normalized (lowercased/trimmed)
    // the email before calling this — see auth.validator.ts. We normalize
    // again here defensively since this repository may be called from
    // future code paths that forget to.
    return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  async findAll(includeInactive = false): Promise<User[]> {
    return prisma.user.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    phone?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: { ...data, email: data.email.toLowerCase().trim() },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    email: string;
    password: string;
    phone: string;
    role: Role;
    isActive: boolean;
    avatar: string;
    lastLoginAt: Date;
    lastLoginIp: string;
    lastLoginUserAgent: string;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
  }>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }

  // ── Failed login / account lockout ─────────────────────────────────

  async incrementFailedLogins(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async lockAccount(id: string, until: Date): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lockedUntil: until },
    });
  }

  async resetFailedLogins(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  // ── Refresh tokens (stored as SHA-256 hashes, never raw JWTs) ───────

  async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async cleanExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }] },
    });
  }
}

export const userRepository = new UserRepository();
