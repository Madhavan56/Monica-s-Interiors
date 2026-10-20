import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import compression from 'compression';
import { env, isProd } from './config/env.js';
import { requestId, sanitize, apiLimiter, notFoundHandler, errorHandler } from './middleware/index.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/users/me.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { wishlistRouter } from './modules/wishlist/wishlist.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { ordersRouter, adminRouter } from './modules/orders/orders.routes.js';
import { webhookRouter } from './modules/tracking/webhook.routes.js';
import { hasWebBuild, webRouter } from './web.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet({ contentSecurityPolicy: false })); // JSON API; the web app sets its own CSP
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  // gzip/deflate responses; never buffer the live-tracking event stream.
  app.use(compression({ filter: (req, res) => !req.path.endsWith('/stream') && compression.filter(req, res) }));
  // Skip logging for noisy SSE heartbeats; log everything else.
  app.use(morgan(isProd ? 'combined' : 'dev', { skip: (req) => req.path.endsWith('/stream') }));

  const api = express.Router();
  // Webhooks need the raw body for signature checks, so they mount before the JSON parser.
  api.use('/webhooks', webhookRouter);
  api.use(express.json({ limit: '100kb' }));
  api.use(cookieParser());
  api.use(sanitize);
  api.use(apiLimiter);

  api.get('/health', (_req, res) => res.json({ data: { ok: true, db: mongoose.connection.readyState === 1 } }));
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/products', productsRouter);
  api.use('/wishlist', wishlistRouter);
  api.use('/cart', cartRouter);
  api.use('/orders', ordersRouter);
  api.use('/admin', adminRouter);

  app.use('/api/v1', api);
  // `npm start` (--serve-web), NODE_ENV=production or SERVE_WEB=true: serve the built web app from this server.
  const serveWeb = isProd || process.env.SERVE_WEB === 'true' || process.argv.includes('--serve-web');
  if (serveWeb && hasWebBuild()) app.use(webRouter());
  else if (serveWeb) console.warn('No web build found (apps/web/dist). Run "npm run build" first.');
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
