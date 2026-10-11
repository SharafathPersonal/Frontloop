import type { NextRequest } from 'next/server';
import { connectDB } from '@/server/db';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  await connectDB();
  if (!(await rateLimit(`forgot-pw:${clientIp(req)}`, 3, 15 * 60))) {
    return jsonError('Too many password reset requests. Please try again later.', 429);
  }

  return Response.json(
    { error: 'Password reset is temporarily disabled. Please contact support@trueattendly.online' },
    { status: 501 },
  );
}
