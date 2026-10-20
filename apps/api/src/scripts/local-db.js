// Long-lived local MongoDB for development (started by `npm run dev` as its own process).
// Keeping the database out of the API process means API restarts (file watching) never
// stop or restart the database. Data persists in apps/api/.data/db.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(here, '../../.data/db');
const PORT = 27019;
const URI = `mongodb://127.0.0.1:${PORT}/`;

async function alreadyRunning() {
  const conn = mongoose.createConnection(URI, { serverSelectionTimeoutMS: 1500 });
  try { await conn.asPromise(); return true; } catch { return false; } finally { await conn.close().catch(() => {}); }
}

const keepAlive = () => setInterval(() => {}, 1 << 30);

if (await alreadyRunning()) {
  // Another copy owns it (e.g. a second `npm run dev`). Stay up so the dev runner keeps going.
  console.log(`Local MongoDB already running at ${URI}`);
  keepAlive();
} else {
  fs.mkdirSync(dbPath, { recursive: true });
  // A crashed previous run can leave a stale lock file behind; mongod refuses to start with it.
  const lock = path.join(dbPath, 'mongod.lock');
  if (fs.existsSync(lock) && fs.statSync(lock).size > 0) fs.writeFileSync(lock, '');
  const server = await MongoMemoryServer.create({ instance: { dbPath, port: PORT, storageEngine: 'wiredTiger' } });
  console.log(`Local MongoDB ready at ${server.getUri()} (data in apps/api/.data/db)`);
  keepAlive();
  const stop = async () => { await server.stop({ doCleanup: false }); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
