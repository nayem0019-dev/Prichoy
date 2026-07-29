/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 5 — Real Customer Auth
// Replaces the localStorage-only demo login with server-persisted
// sessions. Uses bcrypt for password hashing and a signed JWT exactly
// as the admin auth service does (see auth.service.ts) — but a separate
// table (CustomerSession) so customer tokens can never be confused with
// admin tokens.
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

const SALT_ROUNDS = 10;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class CustomerAuthService {
  async register(input: { name: string; phone: string; email?: string; password: string }) {
    const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
    if (existing) throw new AppError('Phone number already registered', HTTP_STATUS.CONFLICT);
    if (input.email) {
      const emailExists = await prisma.customer.findUnique({ where: { email: input.email } });
      if (emailExists) throw new AppError('Email already registered', HTTP_STATUS.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const customer = await prisma.customer.create({
      data: { name: input.name, phone: input.phone, email: input.email, passwordHash, isVerified: true },
    });
    return this.issueToken(customer.id);
  }

  async login(phone: string, password: string) {
    const customer: any = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new AppError('Invalid phone number or password', HTTP_STATUS.UNAUTHORIZED);
    if (customer.isBlocked) throw new AppError('Your account has been suspended', HTTP_STATUS.FORBIDDEN);
    if (!customer.passwordHash) throw new AppError('Password login not set up — account created via order', HTTP_STATUS.BAD_REQUEST);

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) throw new AppError('Invalid phone number or password', HTTP_STATUS.UNAUTHORIZED);

    return { ...(await this.issueToken(customer.id)), customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email } };
  }

  private async issueToken(customerId: string) {
    const raw = crypto.randomBytes(32).toString('hex');
    const token = jwt.sign({ customerId, type: 'customer' }, env.jwt.secret, { expiresIn: '30d', algorithm: 'HS256' });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.customerSession.create({
      data: { customerId, tokenHash: hashToken(raw), expiresAt },
    });
    return { token };
  }

  async verifyToken(bearerToken: string): Promise<any> {
    try {
      const payload: any = jwt.verify(bearerToken, env.jwt.secret, { algorithms: ['HS256'] });
      if (payload.type !== 'customer') throw new Error('Not a customer token');
      const customer: any = await prisma.customer.findUnique({ where: { id: payload.customerId } });
      if (!customer || customer.isBlocked || customer.isDeleted) throw new Error('Account not valid');
      return customer;
    } catch {
      throw new AppError('Invalid or expired session — please log in again', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  async getProfile(customerId: string) {
    return prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true, createdAt: true, totalOrders: true, totalSpent: true, addresses: true, notificationPrefs: true },
    });
  }

  async updateProfile(customerId: string, input: { name?: string; email?: string }) {
    if (input.email) {
      const dup = await prisma.customer.findFirst({ where: { email: input.email, NOT: { id: customerId } } });
      if (dup) throw new AppError('Email already in use', HTTP_STATUS.CONFLICT);
    }
    return prisma.customer.update({ where: { id: customerId }, data: input });
  }

  async changePassword(customerId: string, oldPassword: string, newPassword: string) {
    const customer: any = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customer.passwordHash) {
      const valid = await bcrypt.compare(oldPassword, customer.passwordHash);
      if (!valid) throw new AppError('Current password is incorrect', HTTP_STATUS.BAD_REQUEST);
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.customer.update({ where: { id: customerId }, data: { passwordHash } });
  }
}

export const customerAuthService = new CustomerAuthService();
