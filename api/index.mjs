// Vercel serverless entry point. vercel.json rewrites every /api/* request here; the request keeps
// its original URL (/api/v1/...), so the regular Express app handles routing as usual.
// The built React app (apps/web/dist) is served by Vercel's CDN, not by this function.
import { createApp } from '../apps/api/src/app.js';
import { connectDb } from '../apps/api/src/config/db.js';
import { seedIfEmpty } from '../apps/api/src/scripts/seed.js';

const app = createApp();

// One database connection per warm function instance, reused across requests.
let ready;
const init = () => {
  ready ??= connectDb()
    .then(seedIfEmpty)
    .catch((err) => {
      ready = undefined; // let the next request retry
      throw err;
    });
  return ready;
};

export default async function handler(req, res) {
  try {
    await init();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'DB_UNAVAILABLE', message: 'The store is starting up. Try again in a moment.' } }));
    return;
  }
  app(req, res);
}
