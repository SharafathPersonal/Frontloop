/**
 * Builds/reconciles every Mongoose index. Run in CI before promoting a deploy:
 * production connections use `autoIndex: false`.
 *
 *   npm run db:indexes              # apply
 *   npm run db:indexes -- --dry-run # report the diff only
 */
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import { getEnv } from '../src/server/env';
import * as models from '../src/server/models';
import { hasFlag, loadLocalEnv } from './lib/cli';

type Report = { model: string; toCreate: number; toDrop: string[]; total: number };

const describe = (spec: unknown) => JSON.stringify(spec);

async function reconcile(model: mongoose.Model<never>, dryRun: boolean): Promise<Report> {
  const diff = await model.diffIndexes();
  if (!dryRun) await model.syncIndexes();
  const total = dryRun ? model.schema.indexes().length + 1 : (await model.listIndexes()).length; // +1 = _id_
  return {
    model: model.modelName,
    toCreate: diff.toCreate.length,
    toDrop: diff.toDrop.map((i) => (typeof i === 'string' ? i : describe(i))),
    total,
  };
}

async function main() {
  loadLocalEnv();
  const dryRun = hasFlag('--dry-run');
  const env = getEnv(); // fail fast on malformed configuration

  // Dev connections autoIndex on connect; that would race the diff below and
  // misreport what this script changed. Schema-level options take precedence.
  for (const m of Object.values(models)) m.schema.set('autoIndex', false);

  await connectDB();
  console.log(`${dryRun ? '[dry-run] ' : ''}Reconciling indexes on database "${env.MONGODB_DB}"\n`);

  const reports = await Promise.all(
    Object.values(models).map((m) => reconcile(m as unknown as mongoose.Model<never>, dryRun)),
  );

  for (const r of reports) {
    const changes = [
      r.toCreate ? `${dryRun ? 'would create' : 'created'} ${r.toCreate}` : null,
      r.toDrop.length ? `${dryRun ? 'would drop' : 'dropped'} ${r.toDrop.join(', ')}` : null,
    ].filter(Boolean);
    console.log(`✓ ${r.model.padEnd(16)} ${String(r.total).padStart(2)} indexes  ${changes.join('; ') || 'in sync'}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
