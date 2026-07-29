import { z } from 'zod';

// bcrypt silently truncates anything past 72 BYTES — we cap at 72
// characters (a conservative proxy for bytes; multi-byte UTF-8 characters
// would hit the byte ceiling sooner, which hashPassword() in utils/hash.ts
// also guards against at the point of hashing).
const MAX_PASSWORD_LENGTH = 72;

// Enforced on registration/password-change only (not on login — login
// must accept whatever the account's password looked like when it was
// originally set, even if policy tightens later; rejecting it there would
// lock people out rather than just steering new/changed passwords).
const strongPassword = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(MAX_PASSWORD_LENGTH, `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`)
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

const email = z
  .string()
  .email('Invalid email')
  .max(254, 'Email is too long') // RFC 5321 limit
  .transform((v) => v.toLowerCase().trim());

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email('Invalid email').max(254).transform((v) => v.toLowerCase().trim()),
    // Deliberately NOT re-validating strength on login — only length, to
    // bound the cost of the bcrypt.compare call against a malicious
    // oversized input.
    password: z.string().min(1, 'Password required').max(MAX_PASSWORD_LENGTH, 'Invalid credentials'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name:     z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    email,
    password: strongPassword,
    phone:    z.string().trim().max(20).optional(),
    role:     z.enum([
      'SUPER_ADMIN','ADMIN','ORDER_MANAGER',
      'INVENTORY_MANAGER','CUSTOMER_SUPPORT','DELIVERY_MANAGER','ACCOUNTANT'
    ]).optional(),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    // Optional: the browser-based admin app sends this via an httpOnly
    // cookie instead (see utils/cookies.ts), so the body is only actually
    // used by non-cookie clients. The controller checks the cookie first.
    refreshToken: z.string().min(1).max(2000, 'Malformed token').optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password required').max(MAX_PASSWORD_LENGTH),
    newPassword:     strongPassword,
  }),
});
