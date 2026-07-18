/**
 * PRICHOY ERP — Passenger Entry Point
 * ─────────────────────────────────────────────────────────────────
 * This is the file you point cPanel's "Setup Node.js App" to as the
 * "Application startup file". It simply requires the compiled
 * TypeScript output at dist/server.js.
 *
 * cPanel Setup:
 *   1. Application root:      backend/
 *   2. Application URL:       api.prichoy.com  (or yourdomain.com/api)
 *   3. Application startup file: passenger_app.js
 *   4. Node version:          18.x or 20.x
 *
 * After deployment via Git or File Manager:
 *   1. Click "Run NPM Install" in cPanel Node.js App interface
 *   2. SSH in (or use cPanel Terminal) and run:
 *        npm run build
 *        npm run db:generate
 *        npm run db:migrate
 *   3. Click "Restart" in cPanel Node.js App interface
 * ─────────────────────────────────────────────────────────────────
 */

require('./dist/server.js');
