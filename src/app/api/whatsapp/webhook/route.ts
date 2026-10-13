import 'server-only';
import { NextRequest, after } from 'next/server';
import mongoose from 'mongoose';
import { requireEnv } from '@/server/env';
import { safeEqual, verifyMetaSignature } from '@/server/crypto';
import { connectDB } from '@/server/db';
import { getTenantByPhoneNumberId } from '@/server/tenant-resolver';
import { Lead } from '@/server/models/Lead';
import { Message, type DeliveryStatus } from '@/server/models/Message';
import { processInboundMessageReply } from '@/server/reply-worker';

export const dynamic = 'force-dynamic';

/**
 * GET Verification Challenge from Meta
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && safeEqual(token, requireEnv('META_VERIFY_TOKEN'))) {
    return new Response(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Forbidden', { status: 403 });
}

// Monotonic delivery receipt order: received -> sent -> delivered -> read
const STATUS_ORDER: Record<string, number> = {
  received: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

function normalizePhoneNumber(rawPhone: string): string {
  return rawPhone.replace(/\D/g, '');
}

/**
 * POST Webhook Ingestion from Meta
 */
export async function POST(req: NextRequest) {
  // Fail closed: a missing secret throws (500) rather than accepting unsigned payloads.
  const appSecret = requireEnv('META_APP_SECRET');

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-hub-signature-256');

  if (!verifyMetaSignature(rawBody, signatureHeader, appSecret)) {
    console.warn('[WhatsApp Webhook] Invalid x-hub-signature-256 HMAC check');
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const p = payload as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          messaging_product?: string;
          metadata?: {
            display_phone_number?: string;
            phone_number_id?: string;
          };
          contacts?: Array<{
            profile?: { name?: string };
            wa_id?: string;
          }>;
          messages?: Array<{
            from?: string;
            id?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
          }>;
          statuses?: Array<{
            id?: string;
            status?: string;
            timestamp?: string;
            recipient_id?: string;
            errors?: Array<{ code?: number; title?: string }>;
          }>;
        };
      }>;
    }>;
  };

  if (p.object !== 'whatsapp_business_account' || !Array.isArray(p.entry)) {
    return new Response('OK', { status: 200 });
  }

  await connectDB();

  // Collect pending inbound messages to schedule for background execution
  const pendingInboundMessagesToProcess: Array<{
    messageId: string;
    tenantId: string;
    leadId: string;
    phoneNumberId: string;
  }> = [];

  for (const entry of p.entry) {
    if (!Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      if (change.field !== 'messages' || !change.value) continue;

      const val = change.value;
      const phoneNumberId = val.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Resolve tenant with in-memory TTL caching
      const tenant = await getTenantByPhoneNumberId(phoneNumberId);
      if (!tenant) {
        console.warn(`[WhatsApp Webhook] Tenant not found for phone_number_id: ${phoneNumberId}`);
        continue;
      }

      const tenantObjectId = new mongoose.Types.ObjectId(tenant.id);

      // 1. Process delivery receipts (statuses)
      if (Array.isArray(val.statuses)) {
        for (const st of val.statuses) {
          const waMessageId = st.id;
          const newStatus = st.status as DeliveryStatus | undefined;
          if (!waMessageId || !newStatus) continue;

          const currentMsg = await Message.findOne({
            waMessageId,
            tenantId: tenantObjectId,
          }).lean();

          if (currentMsg) {
            const currentRank = STATUS_ORDER[currentMsg.status || 'sent'] ?? 0;
            const newRank = STATUS_ORDER[newStatus] ?? 0;

            // Monotonic update check: only progress forward or record failed
            if (newRank > currentRank || newStatus === 'failed') {
              const statusUpdate: Record<string, unknown> = {
                $set: { status: newStatus },
              };

              if (st.errors && st.errors.length > 0) {
                (statusUpdate.$set as Record<string, unknown>).error = {
                  code: st.errors[0].code,
                  title: st.errors[0].title,
                };
              }

              await Message.updateOne(
                { _id: currentMsg._id, tenantId: tenantObjectId },
                statusUpdate,
              );
            }
          }
        }
      }

      // 2. Process incoming customer messages
      if (Array.isArray(val.messages)) {
        // Map contacts for profile names
        const contactsMap = new Map<string, string>();
        if (Array.isArray(val.contacts)) {
          for (const c of val.contacts) {
            if (c.wa_id && c.profile?.name) {
              contactsMap.set(normalizePhoneNumber(c.wa_id), c.profile.name);
            }
          }
        }

        for (const msg of val.messages) {
          if (!msg.from || !msg.id) continue;

          const customerPhone = normalizePhoneNumber(msg.from);
          const profileName = contactsMap.get(customerPhone);
          const waTimestamp = msg.timestamp
            ? new Date(parseInt(msg.timestamp, 10) * 1000)
            : new Date();

          // Upsert Lead. $max keeps timestamps monotonic when Meta delivers out of order.
          const leadUpsertDoc = await Lead.findOneAndUpdate(
            { tenantId: tenantObjectId, phone: customerPhone },
            {
              $max: { lastInboundAt: waTimestamp, lastMessageAt: waTimestamp },
              ...(profileName ? { $set: { profileName } } : {}),
              $setOnInsert: {
                status: 'new',
                intent: 'enquiry',
                botPaused: false,
              },
            },
            { upsert: true, returnDocument: 'after' },
          ).lean();

          if (!leadUpsertDoc) continue;

          // Message body extraction
          let messageBody = '';
          const msgType = msg.type || 'text';
          if (msgType === 'text') {
            messageBody = msg.text?.body || '';
          } else {
            messageBody = `[${msgType} message]`;
          }

          // Insert Message with waMessageId (gracefully catching duplicate deliveries on E11000)
          try {
            const insertedMsg = await Message.create({
              tenantId: tenantObjectId,
              leadId: leadUpsertDoc._id,
              direction: 'in',
              author: 'customer',
              waMessageId: msg.id,
              type: msgType,
              body: messageBody.slice(0, 4096),
              status: 'received',
              replyState: 'pending',
              waTimestamp,
            });

            // Counted only after the insert succeeds, so Meta retries don't inflate it.
            await Lead.updateOne(
              { _id: leadUpsertDoc._id, tenantId: tenantObjectId },
              { $inc: { messageCount: 1 } },
            );

            pendingInboundMessagesToProcess.push({
              messageId: String(insertedMsg._id),
              tenantId: tenant.id,
              leadId: String(leadUpsertDoc._id),
              phoneNumberId,
            });
          } catch (err: unknown) {
            // E11000 on waMessageId = Meta redelivery of a message we already hold.
            const isDup =
              typeof err === 'object' &&
              err !== null &&
              'code' in err &&
              (err as { code: number }).code === 11000;

            if (!isDup) {
              console.error('[WhatsApp Webhook] Error inserting inbound message:', err);
            }
          }
        }
      }
    }
  }

  // One after() per message so a burst runs concurrently instead of serially
  // outliving the function's max duration. Claims are atomic, and burst coalescing
  // in the worker still answers only the newest message per lead.
  for (const item of pendingInboundMessagesToProcess) {
    after(async () => {
      try {
        await processInboundMessageReply(item);
      } catch (bgErr) {
        console.error(`[WhatsApp Background Reply] Failed processing message ${item.messageId}:`, bgErr);
      }
    });
  }

  // Fast 200 OK return to Meta
  return new Response('OK', { status: 200 });
}

