import 'server-only';
import { RateLimit } from './models/RateLimit';

/**
 * Fixed-window counter shared across all serverless instances.
 * Returns true while the caller is within `limit` hits per `windowSec`.
 * Caller must have awaited connectDB().
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const windowMs = windowSec * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const doc = await RateLimit.findOneAndUpdate(
    { _id: `${key}:${bucket}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  return (doc?.count ?? 0) <= limit;
}
