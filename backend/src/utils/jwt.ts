import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../types';

// Pinning the algorithm on every verify() call closes off algorithm-
// confusion style attacks (e.g. a token crafted with alg:"none" or a
// different algorithm than the server expects). jsonwebtoken already
// rejects "none" by default, but explicit is safer than implicit.
const ALGORITHM: jwt.Algorithm = 'HS256';

type TokenType = 'access' | 'refresh';

interface SignedPayload extends AuthPayload {
  type: TokenType;
}

/**
 * Access and refresh tokens are signed with different secrets AND now
 * carry an explicit `type` claim. This means even if JWT_SECRET and
 * JWT_REFRESH_SECRET were ever accidentally configured to the same value,
 * a refresh token still cannot be used as an access token (and vice
 * versa) because the verify functions below reject a mismatched `type`.
 */
export function signAccessToken(payload: AuthPayload): string {
  const body: SignedPayload = { ...payload, type: 'access' };
  return jwt.sign(body, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    algorithm: ALGORITHM,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: AuthPayload): string {
  const body: SignedPayload = { ...payload, type: 'refresh' };
  return jwt.sign(body, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    algorithm: ALGORITHM,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITHM] }) as SignedPayload;
  if (decoded.type !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.jwt.refreshSecret, { algorithms: [ALGORITHM] }) as SignedPayload;
  if (decoded.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return decoded;
}

export function decodeToken(token: string): AuthPayload | null {
  try {
    return jwt.decode(token) as AuthPayload;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiryDate(): Date {
  const days = parseInt(env.jwt.refreshExpiresIn.replace('d', ''), 10) || 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
