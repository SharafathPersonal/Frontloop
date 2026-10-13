import 'server-only';
import { NextRequest } from 'next/server';
import { requireEnv } from '@/server/env';
import { safeEqual } from '@/server/crypto';
import { connectDB } from '@/server/db';
import { Message, type MessageDoc } from '@/server/models/Message';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { processInboundMessageReply } from '@/server/reply-worker';
import { SERVICE_WINDOW_MS } from '@/lib/whatsapp-window';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Stop claiming new work with headroom for one in-flight reply (~40s worst case
// across three LLM tiers and the Meta send) before the platform kills the function.
const WALL_TIME_BUDGET_MS = 45 * 1000;
const BATCH_SIZE = 15;
const STALLED_PROCESSING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const ORPHAN_PENDING_TIMEOUT_MS = 10 * 1000; // 10 seconds

/**
 * Sweeper cron route to self-heal stalled processing or orphan pending messages.
 * Protected by Bearer CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const deadline = Date.now() + WALL_TIME_BUDGET_MS;
  const cronSecret = requireEnv('CRON_SECRET');

  if (!safeEqual(req.headers.get('authorization'), `Bearer ${cronSecret}`)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await connectDB();

  const now = new Date();
  const stalledCutoff = new Date(now.getTime() - STALLED_PROCESSING_TIMEOUT_MS);
  const pendingCutoff = new Date(now.getTime() - ORPHAN_PENDING_TIMEOUT_MS);
  const windowCutoff = new Date(now.getTime() - SERVICE_WINDOW_MS);

  // 1. Reset stalled processing messages back to pending (cross-tenant system job)
  const resetStalledResult = await Message.updateMany(
    {
      direction: 'in',
      replyState: 'processing',
      claimedAt: { $lt: stalledCutoff },
    },
    {
      $set: { replyState: 'pending' },
      $unset: { claimedAt: 1 },
    },
  ).setOptions({ crossTenant: true });

  // 2. Expire pending messages that can no longer be answered (cross-tenant system job)
  const expiredResult = await Message.updateMany(
    { direction: 'in', replyState: 'pending', createdAt: { $lte: windowCutoff } },
    { $set: { replyState: 'skipped', replyNote: 'Expired in queue past the 24-hour service window' } },
  ).setOptions({ crossTenant: true });

  // 3. Find orphan pending inbound messages (cross-tenant system job)
  const pendingMessages = await Message.find({
    direction: 'in',
    replyState: 'pending',
    createdAt: { $lt: pendingCutoff, $gt: windowCutoff },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE)
    .setOptions({ crossTenant: true })
    .lean<Array<MessageDoc & { _id: unknown }>>();

  const processedCount = pendingMessages.length;
  let replayedCount = 0;
  let errorCount = 0;
  let deferredCount = 0;

  for (const [index, msg] of pendingMessages.entries()) {
    if (Date.now() > deadline) {
      // Left `pending`; the next sweep picks them up.
      deferredCount = pendingMessages.length - index;
      break;
    }
    try {
      // Find the tenant to obtain its phoneNumberId
      const tenant = await BusinessTenant.findById(msg.tenantId).lean();
      const phoneNumberId = tenant?.whatsapp?.phoneNumberId;

      if (!phoneNumberId) {
        // Without phoneNumberId, we cannot dispatch a WhatsApp reply; mark failed
        await Message.updateOne(
          { _id: msg._id, tenantId: msg.tenantId },
          {
            $set: {
              replyState: 'failed',
              replyNote: 'No WhatsApp phone_number_id found on tenant',
            },
          },
        );
        continue;
      }

      await processInboundMessageReply({
        messageId: String(msg._id),
        tenantId: String(msg.tenantId),
        leadId: String(msg.leadId),
        phoneNumberId,
      });

      replayedCount++;
    } catch (err) {
      errorCount++;
      console.error(
        `[Reply Sweeper] Error processing message ${msg._id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return Response.json({
    ok: true,
    resetStalledCount: resetStalledResult.modifiedCount,
    expiredCount: expiredResult.modifiedCount,
    pendingFoundCount: processedCount,
    replayedCount,
    errorCount,
    deferredCount,
    timestamp: now.toISOString(),
  });
}

