/**
 * PRICHOY ERP — Backend Server
 *
 * cPanel Passenger Compatibility:
 * ─────────────────────────────────────────────────────────────────
 * cPanel's "Setup Node.js App" uses Passenger which:
 *   1. Sets process.env.PORT automatically
 *   2. Expects the app to export the Express app OR listen on PORT
 *   3. Entry point must be compiled dist/server.js
 *
 * This file handles both:
 *   - Direct Node.js execution (development)
 *   - Passenger module loading (production on cPanel)
 * ─────────────────────────────────────────────────────────────────
 */

import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './config/logger';
import fs from 'fs';
import path from 'path';

// Ensure required directories exist (cPanel shared hosting)
const dirs = ['logs', 'uploads', 'uploads/products', 'uploads/temp'];
dirs.forEach((dir) => {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    logger.info(`Created directory: ${full}`);
  }
});

async function startServer(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // PORT is set by cPanel Passenger automatically
    const port = process.env.PORT || env.port;
    const server = app.listen(port, () => {
      logger.info(`🚀 Prichoy API running on port ${port}`);
      logger.info(`   Environment: ${env.nodeEnv}`);
      logger.info(`   Health check: http://localhost:${port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Graceful shutdown...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed. Exiting.');
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      shutdown('uncaughtException');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();

// ── Passenger module export ───────────────────────────────────────
// cPanel Passenger can also load as a module
module.exports = app;
