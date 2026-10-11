/**
 * Builds/reconciles every Mongoose index. Run in CI before promoting a deploy:
 * production connections use `autoIndex: false`.
 *
 *   npm run db:indexes
 */
import mongoose from 'mongoose';
import * as models from '../src/server/models';

async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // CI provides env vars directly
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'attendly', autoIndex: false });

  for (const model of Object.values(models)) {
    const dropped = await model.syncIndexes();
    console.log(`✓ ${model.modelName}${dropped.length ? ` (dropped: ${dropped.join(', ')})` : ''}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
