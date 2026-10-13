import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/server/db';
import { rateLimit } from '@/server/rate-limit';
import { clientIp, isSameOrigin, jsonError } from '@/server/http';
import { readGuestSession } from '@/server/auth/guest-session';
import { sendWebChatMessage } from '@/server/web-chat';

export const runtime = 'nodejs';
// Synchronous AI turn: up to three 10s LLM tiers plus database writes.
export const maxDuration = 60;

const Body = z
  .object({
    tenantId: z.string().regex(/^[a-f0-9]{24}$/),
    text: z.string().trim().min(1, 'Type a message.').max(2000, 'Messages can be at most 2,000 characters.').optional(),
    requestHuman: z.boolean().optional(),
  })
  .refine((b) => b.text || b.requestHuman, { message: 'Type a message.' });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError('Forbidden', 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid message.', 400);
  const { tenantId, text, requestHuman } = parsed.data;

  const session = await readGuestSession(tenantId);
  if (!session) return jsonError('Your chat session has ended. Please start a new chat.', 401);

  await connectDB();
  if (!(await rateLimit(`chat:msg:ip:${clientIp(req)}`, 60, 10 * 60))) {
    return jsonError('Too many messages. Please wait a few minutes.', 429);
  }

  try {
    const result = await sendWebChatMessage(session, { text, requestHuman });
    if (!result.ok) return jsonError(result.error, result.status);
    const { customerMessage, reply, botPaused, notice } = result;
    return Response.json({ customerMessage, reply, botPaused, notice });
  } catch (err) {
    console.error('[Web Chat] Message failed', err instanceof Error ? err.message : err);
    return jsonError('Something went wrong sending your message. Please try again.', 500);
  }
}
