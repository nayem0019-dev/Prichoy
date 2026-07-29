import winston from 'winston';
import path from 'path';
import { env } from './env';

const logDir = path.join(process.cwd(), 'logs');

const formats = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
];

export const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(...formats, winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) =>
          stack
            ? `${timestamp} [${level}]: ${message}\n${stack}`
            : `${timestamp} [${level}]: ${message}`
        )
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

/**
 * Dedicated, isolated log for authentication and authorization events:
 * login success/failure, logout, account lockout, password change,
 * permission-denied, token refresh/revocation. Kept separate from the
 * general application log so it can be shipped, retained, and reviewed
 * independently (e.g. for incident response) without being diluted by
 * routine request logs.
 *
 * securityLogger never receives request bodies, tokens, or password
 * values — only event metadata (who, what, when, from where).
 */
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(...formats, winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    ...(env.isDevelopment
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) =>
              `${timestamp} [SECURITY:${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
            )
          ),
        })]
      : []),
  ],
});

export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): void {
  securityLogger.info(event, details);
}
