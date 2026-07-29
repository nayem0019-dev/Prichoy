import { Response, Request } from 'express';
import { env } from '../config/env';

export const REFRESH_COOKIE_NAME = 'prc_rt';

/**
 * The refresh token is set as an httpOnly cookie rather than returned in
 * the JSON response body. This means client-side JavaScript — including
 * any malicious script injected via an XSS vulnerability anywhere in the
 * admin app's dependency tree — cannot read it at all via
 * document.cookie or localStorage. The access token is still returned in
 * the JSON body and kept client-side (it's short-lived, 15 minutes by
 * default, which bounds the damage if it does leak).
 */
export function setRefreshCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: !env.isDevelopment,
    sameSite: env.isDevelopment ? 'lax' : 'strict',
    domain: env.cookieDomain,
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: !env.isDevelopment,
    sameSite: env.isDevelopment ? 'lax' : 'strict',
    domain: env.cookieDomain,
    path: '/api/auth',
  });
}

export function getRefreshCookie(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME];
}
