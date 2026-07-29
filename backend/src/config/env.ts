import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Fail fast, before the HTTP server ever starts listening.
  // eslint-disable-next-line no-console
  console.error(
    `\n❌ Missing required environment variable(s): ${missing.join(', ')}\n` +
    `   Copy .env.example to .env and fill in real values before starting the server.\n`
  );
  process.exit(1);
}

// ── Secret strength validation ──────────────────────────────────────
// A short or default-looking JWT secret is trivially brute-forceable
// offline once an attacker has even one signed token to work against.
// We refuse to boot rather than run with a weak secret.
const MIN_SECRET_LENGTH = 32;

function assertStrongSecret(name: string, value: string): void {
  if (value.length < MIN_SECRET_LENGTH) {
    console.error(
      `\n❌ ${name} is only ${value.length} characters long. ` +
      `It must be at least ${MIN_SECRET_LENGTH} characters.\n` +
      `   Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"\n`
    );
    process.exit(1);
  }
}

assertStrongSecret('JWT_SECRET', process.env.JWT_SECRET!);
assertStrongSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET!);

if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error(
    '\n❌ JWT_SECRET and JWT_REFRESH_SECRET must be different values. ' +
    'Using the same secret for both weakens the separation between access ' +
    'and refresh tokens.\n'
  );
  process.exit(1);
}

// In production, refuse to run with an unconfigured SMTP setup silently —
// this is a warning rather than a hard stop since email may legitimately
// not be wired up yet, but it should be visible in logs/console.
if (process.env.NODE_ENV === 'production' && !process.env.SMTP_USER) {
  console.warn('⚠️  SMTP_USER is not configured — outbound email (password resets, notifications) will fail.');
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  db: {
    url: process.env.DATABASE_URL!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  },

  // Cookie domain for the httpOnly refresh-token cookie. Leave unset for
  // local development (cookie scopes to exact host). In production, set
  // this to your shared parent domain (e.g. ".prichoy.com") so the cookie
  // set by api.prichoy.com is readable by requests FROM admin.prichoy.com
  // — without this, the refresh cookie would only ever be sent back to
  // api.prichoy.com directly, which is exactly what we want for a
  // same-site XHR/fetch call (the browser attaches it automatically; we
  // don't need JS on the admin app to ever read it).
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Prichoy Clothing <noreply@prichoy.com>',
  },

  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    // Used to build the absolute URL returned after an upload (e.g.
    // "https://api.prichoy.com/uploads/products/xyz.webp"). The /uploads
    // static route already existed in app.ts before this phase; only the
    // upload pipeline that populates it is new.
    backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '4000'}`,
  },

  company: {
    name: process.env.COMPANY_NAME || 'Prichoy Clothing',
    phone: process.env.COMPANY_PHONE || '01762647661',
    email: process.env.COMPANY_EMAIL || 'nayem@mail.com',
    address: process.env.COMPANY_ADDRESS || 'Dhaka, Bangladesh',
  },

  // Account lockout policy (see auth.service.ts)
  security: {
    maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
    accountLockoutMinutes: parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || '15', 10),
  },
} as const;
