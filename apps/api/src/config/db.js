import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_URI = 'mongodb://127.0.0.1:27019/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let localServer;

async function reachable(uri) {
  const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 1000 });
  try {
    await conn.asPromise();
    return true;
  } catch {
    return false;
  } finally {
    await conn.close().catch(() => {});
  }
}

/** Wait up to `ms` for the local dev database (started by `npm run dev`) to accept connections. */
async function waitForLocal(ms) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    if (await reachable(LOCAL_URI)) return true;
  }
  return false;
}

/**
 * Connect to MONGODB_URI, or to the local dev database.
 * - `npm run dev` runs the local database as its own process (scripts/local-db.js), so the API
 *   just waits for it. API restarts never stop the database.
 * - Run on its own (`npm start`, `npm run seed`) with nothing listening, the API starts a private
 *   local database itself as a fallback.
 */
export async function connectDb() {
  let uri = env.MONGODB_URI;
  if (!uri && process.env.VERCEL) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string in Vercel → Settings → Environment Variables.');
  }
  if (!uri && (await waitForLocal(Number(process.env.LOCAL_DB_WAIT_MS ?? 20_000)))) uri = LOCAL_URI;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(here, '../../.data/db');
    fs.mkdirSync(dbPath, { recursive: true });
    console.log('No database running: starting a private local MongoDB…');
    localServer = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger', port: 27019 } });
    uri = localServer.getUri();
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: 'monicas_interiors', serverSelectionTimeoutMS: 15_000 });
  console.log(`MongoDB connected (${env.MONGODB_URI ? 'MONGODB_URI' : localServer ? 'private local instance' : 'local dev database'})`);
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (localServer) await localServer.stop({ doCleanup: false });
}
