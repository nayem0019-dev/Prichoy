import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

// bcrypt silently truncates input at 72 bytes — anything beyond that is
// ignored, which would give a false sense of security for very long
// passwords. We enforce the 72-byte ceiling explicitly at the validator
// layer (auth.validator.ts) rather than relying on bcrypt's silent
// behavior, but we also defend here in case this function is ever called
// directly with an unvalidated value.
const BCRYPT_MAX_BYTES = 72;

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
    throw new Error(`Password exceeds maximum length of ${BCRYPT_MAX_BYTES} bytes`);
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * One-way hash for refresh tokens before persisting them to the database.
 * SHA-256 (not bcrypt) is intentional here: refresh tokens are already
 * high-entropy random-looking JWTs, not human-guessable passwords, so a
 * fast deterministic hash used purely for lookup-by-hash is appropriate
 * and vastly cheaper than bcrypt at scale. The goal is solely to ensure a
 * raw, database dump does not directly hand out usable tokens.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
