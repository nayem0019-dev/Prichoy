// Phase 6.5 §7 — Input Sanitization Middleware
// Applied as a global middleware in app.ts to prevent common injection
// attacks across all request bodies and query strings. This is a shallow
// strip — it removes known dangerous patterns from string values without
// mutating the structure of the request. It deliberately does NOT parse
// or modify nested arrays/objects beyond stripping dangerous characters,
// so it can't break any existing API contract.
//
// This is NOT a replacement for per-field validation in individual
// controllers (which already exists throughout the codebase via
// express-validator and manual checks). It is an additional defence-in-
// depth layer that catches anything the controller validators might miss.

import { Request, Response, NextFunction } from 'express';

// Strip HTML tags and common XSS patterns from a string value.
// We don't need a full HTML sanitizer library for an admin API that
// returns JSON (not HTML) — stripping tags and script-injection patterns
// is sufficient to prevent stored XSS via the database.
function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // script tags
    .replace(/<[^>]+>/g, '')         // all HTML tags
    .replace(/javascript:/gi, '')    // javascript: URIs
    .replace(/on\w+\s*=/gi, '')      // inline event handlers (onclick=, etc.)
    .trim();
}

// Recursively sanitize all string values in an object.
// Skips non-string primitives and preserves structure.
function sanitizeObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj;  // prevent runaway recursion on malformed input
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, depth + 1));
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }
  return obj;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  // Sanitize query strings too (prevents injection via search params)
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    }
  }
  next();
}

// Security headers middleware — adds safe defaults for admin API responses.
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Don't set HSTS here — that belongs on the reverse proxy (nginx/cloudflare).
  next();
}
