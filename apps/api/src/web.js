// Serves the built React app (apps/web/dist) from the API server in production, so the whole
// store runs as one service on one origin: no proxy, no CORS, and the refresh cookie stays first-party.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');

export const hasWebBuild = () => fs.existsSync(path.join(DIST, 'index.html'));

export function webRouter() {
  const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  // Allow exactly the inline theme script in index.html via its hash, nothing else inline.
  const inline = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    ([, code]) => `'sha256-${crypto.createHash('sha256').update(code).digest('base64')}'`,
  );

  const router = express.Router();
  router.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", ...inline],
      styleSrc: ["'self'", "'unsafe-inline'"], // Framer Motion and React set inline styles
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
    },
  }));

  // Hashed build files never change: cache for a year. Images: a week. HTML: always revalidate.
  router.use('/assets', express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '365d', index: false }));
  router.use('/images', express.static(path.join(DIST, 'images'), { maxAge: '7d', index: false }));
  router.use(express.static(DIST, { index: false, maxAge: '1h' }));

  // Single-page app: every other GET that isn't an API call returns index.html.
  router.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.set('Cache-Control', 'no-cache').type('html').send(indexHtml);
  });
  return router;
}
