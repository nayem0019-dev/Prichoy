import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { generalLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { logger } from './config/logger';

// Routes
import authRoutes      from './routes/auth.routes';
import orderRoutes     from './routes/order.routes';
import productRoutes   from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import customerRoutes  from './routes/customer.routes';
import reportRoutes    from './routes/report.routes';
import exportRoutes    from './routes/export.routes';
import courierRoutes   from './routes/courier.routes';
import settingsRoutes  from './routes/settings.routes';
import trackRoutes     from './routes/track.routes';
import publicRoutes    from './routes/public.routes';
import couponRoutes    from './routes/coupon.routes';

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.disable('x-powered-by'); // Also removed by helmet(), kept explicit for clarity/defense-in-depth
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Handled by Next.js on admin/frontend
  hsts: env.isDevelopment ? false : { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.set('trust proxy', 1); // Required for cPanel reverse proxy

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({
  origin: [env.cors.frontendUrl, env.cors.adminUrl],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parsers ───────────────────────────────────────────────────────
// Global body size limit kept small (1mb) since the large majority of
// endpoints (auth, orders, product edits) only ever need a few KB. Routes
// that legitimately need larger payloads (e.g. future bulk-import
// endpoints) should opt in to a bigger limit explicitly on that route
// rather than the whole API accepting 10mb bodies by default, which was
// an unnecessary DoS surface — a single request could force the server to
// buffer/parse up to 10MB of JSON before any validation even runs.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

// ── Logging ───────────────────────────────────────────────────────
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ── Rate Limiting ─────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ── Static uploads ────────────────────────────────────────────────
// Serve uploaded files (product images, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '7d',
}));

// ── Health check (for cPanel/monitoring) ─────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    version: '1.0.0',
  });
});

// ── API Routes (all under /api) ───────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/customers',  customerRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/export',     exportRoutes);
app.use('/api/couriers',   courierRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/track',      trackRoutes); // Public — Phase 2 §10, see track.routes.ts
app.use('/api/public',     publicRoutes); // Public — Phase 3.1 storefront, see public.routes.ts
app.use('/api/coupons',    couponRoutes);

// ── 404 + Error handler ───────────────────────────────────────────
app.use('/api/*', notFoundHandler);
app.use(errorHandler as express.ErrorRequestHandler);

export default app;
