import 'server-only';
import mongoose from 'mongoose';
import { attachDatabasePool } from '@vercel/functions';
import { getEnv } from './env';

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Survives HMR in dev and is reused across invocations on a warm serverless instance.
const g = globalThis as unknown as { __mongoose?: MongooseCache };
const cache: MongooseCache = (g.__mongoose ??= { conn: null, promise: null });

mongoose.set('strictQuery', true);

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const env = getEnv();
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB,
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 10_000,
        serverSelectionTimeoutMS: 5_000,
        socketTimeoutMS: 20_000,
        bufferCommands: false, // fail fast instead of queueing against a dead connection
        autoIndex: env.NODE_ENV !== 'production', // production indexes: `npm run db:indexes`
      })
      .then((m) => {
        // Vercel Fluid compute: release idle sockets before the instance suspends.
        attachDatabasePool(m.connection.getClient());
        return m;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // let the next invocation retry
    throw err;
  }
  return cache.conn;
}
