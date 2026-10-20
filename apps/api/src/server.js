import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { closeAllStreams } from './modules/tracking/tracking.service.js';
import { seedIfEmpty } from './scripts/seed.js';

await connectDb();
await seedIfEmpty();

const server = createApp().listen(env.PORT, () => {
  console.log(`API ready at http://localhost:${env.PORT}/api/v1`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${env.PORT} is already in use. Stop the other process or set PORT in apps/api/.env.`);
  else console.error(err);
  process.exit(1);
});

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`${signal} received, shutting down…`);
  closeAllStreams();
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
