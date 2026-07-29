import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../utils/cookies';
import { env } from '../config/env';

function refreshCookieMaxAgeMs(): number {
  const days = parseInt(env.jwt.refreshExpiresIn.replace('d', ''), 10) || 7;
  return days * 24 * 60 * 60 * 1000;
}

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const newUser = await authService.register(req.body);
  sendCreated(res, newUser, 'Account created successfully');
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const result = await authService.login({ ...req.body, ip, userAgent });

  setRefreshCookie(res, result.refreshToken, refreshCookieMaxAgeMs());
  // Refresh token is deliberately NOT included in the JSON body — it only
  // ever exists as an httpOnly cookie, unreadable by client-side JS.
  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
});

export const refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Prefer the httpOnly cookie (browser-based admin app). Fall back to a
  // body-supplied token for non-browser clients that cannot use cookies
  // (e.g. a future native mobile app) — validated the same way either way.
  const token = getRefreshCookie(req) ?? req.body?.refreshToken;
  if (!token) {
    sendSuccess(res, null, 'No refresh token provided');
    res.status(401);
    return;
  }

  const ip = req.ip ?? req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const tokens = await authService.refreshTokens(token, { ip, userAgent });

  setRefreshCookie(res, tokens.refreshToken, refreshCookieMaxAgeMs());
  sendSuccess(res, { accessToken: tokens.accessToken }, 'Tokens refreshed');
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = getRefreshCookie(req) ?? req.body?.refreshToken;
  await authService.logout(req.user!.userId, token);
  clearRefreshCookie(res);
  sendSuccess(res, null, 'Logged out successfully');
});

export const logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  await authService.logoutAll(req.user!.userId);
  clearRefreshCookie(res);
  sendSuccess(res, null, 'Logged out from all devices');
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.userId);
  sendSuccess(res, profile);
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.userId, currentPassword, newPassword);
  clearRefreshCookie(res); // All sessions revoked server-side; also drop the local cookie.
  sendSuccess(res, null, 'Password changed. Please login again.');
});
