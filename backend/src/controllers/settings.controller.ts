import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/response';

export const getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { group } = req.query;
  const settings = await prisma.setting.findMany({
    where: group ? { group: group as string } : {},
    orderBy: { group: 'asc' },
  });
  // Convert to key-value object grouped
  const grouped: Record<string, Record<string, string>> = {};
  settings.forEach(({ key, value, group: g }) => {
    if (!grouped[g]) grouped[g] = {};
    grouped[g][key] = value;
  });
  sendSuccess(res, grouped);
});

export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updates: { key: string; value: string; group: string }[] = req.body.settings;
  await Promise.all(
    updates.map(({ key, value, group }) =>
      prisma.setting.upsert({
        where:  { key },
        update: { value },
        create: { key, value, group },
      })
    )
  );
  sendSuccess(res, null, 'Settings saved');
});

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { isRead: false } });
  sendSuccess(res, { notifications, unreadCount });
});

export const markNotificationsRead = asyncHandler(async (_req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  sendSuccess(res, null, 'All notifications marked as read');
});

export const getActivityLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const logs = await prisma.activityLog.findMany({
    include: { admin: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(req.query.limit) || 100,
  });
  sendSuccess(res, logs);
});

export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' }, take: 200 });
  sendSuccess(res, expenses);
});

export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expense.create({ data: req.body });
  sendSuccess(res, expense, 'Expense recorded');
});

export const updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expense.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, expense, 'Expense updated');
});

export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'Expense deleted');
});

export const getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, isActive: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, users);
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Explicit whitelist instead of spreading req.body directly into
  // Prisma. The previous implementation only excluded `password` and
  // passed everything else through verbatim — meaning any other field
  // present in the request body (including ones that don't belong on
  // this model, or fields like failedLoginAttempts/lockedUntil that
  // should only ever be set by the auth service) would have been written
  // straight to the database if a client included them, whether
  // intentionally or not.
  const { name, email, phone, role, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined)     data.name     = name;
  if (email !== undefined)    data.email    = String(email).toLowerCase().trim();
  if (phone !== undefined)    data.phone    = phone;
  if (role !== undefined)     data.role     = role;
  if (isActive !== undefined) data.isActive = isActive;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
    },
  });

  // If this update deactivates the account, kill its existing sessions
  // immediately rather than relying solely on the next authenticate()/
  // refresh call to discover isActive=false.
  if (isActive === false) {
    await prisma.refreshToken.updateMany({
      where: { userId: req.params.id },
      data: { isRevoked: true },
    });
  }

  sendSuccess(res, user, 'User updated');
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'User deleted');
});
