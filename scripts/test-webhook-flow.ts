/**
 * End-to-end harness for the WhatsApp ingestion + reply pipeline against a
 * running app (`npm run dev` or `npm start`) — no Meta, no ngrok.
 *
 *   npm run db:seed && npm run test:webhook
 *   npm run test:webhook -- --cleanup     # delete the synthetic lead afterwards
 *
 * Env: WEBHOOK_BASE_URL (default http://localhost:3000),
 *      WEBHOOK_LATENCY_BUDGET_MS (default 150), SEED_TENANT_SLUG.
 *
 * Step 4 needs a real WhatsApp token on the tenant (SEED_WA_ACCESS_TOKEN at seed
 * time) and a reachable customer number; otherwise it reports the worker's
 * recorded failure reason, which still proves the worker ran end to end.
 */
import { createHmac, randomBytes, randomInt } from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import { requireEnv } from '../src/server/env';
import { BusinessTenant, Lead, Message } from '../src/server/models';
import { hasFlag, loadLocalEnv, SEED_TENANT_SLUG } from './lib/cli';

const BASE_URL = process.env.WEBHOOK_BASE_URL ?? 'http://localhost:3000';
const LATENCY_BUDGET_MS = Number(process.env.WEBHOOK_LATENCY_BUDGET_MS ?? 150);
const WORKER_TIMEOUT_MS = 45_000;
const TERMINAL_STATES = ['done', 'skipped', 'failed'];

let failures = 0;
function check(ok: boolean, label: string, detail: string | null = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const sign = (body: string, secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

async function post(body: string, signature: string) {
  const started = performance.now();
  const res = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': signature },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  await res.text();
  return { status: res.status, ms: Math.round(performance.now() - started) };
}

function inboundPayload(phoneNumberId: string, displayPhone: string, from: string, wamid: string, text: string) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_TEST',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: displayPhone, phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: 'Harness Patient' }, wa_id: from }],
              messages: [
                {
                  from,
                  id: wamid,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

async function main() {
  loadLocalEnv();
  const appSecret = requireEnv('META_APP_SECRET');
  const verifyToken = requireEnv('META_VERIFY_TOKEN');

  await connectDB();
  const tenant = await BusinessTenant.findOne({ slug: SEED_TENANT_SLUG }).lean();
  const phoneNumberId = tenant?.whatsapp?.phoneNumberId;
  if (!tenant || !phoneNumberId) {
    throw new Error(`Tenant "${SEED_TENANT_SLUG}" with a phone_number_id not found — run \`npm run db:seed\` first.`);
  }

  // Fresh synthetic customer per run so "new lead" assertions are deterministic.
  const customerPhone = `9199${randomInt(10_000_000, 99_999_999)}`;
  const wamid = `wamid.HARNESS${randomBytes(12).toString('hex').toUpperCase()}`;
  const text = 'Dr. Rahul nalae available aano? What is the consultation fee?';
  const body = inboundPayload(phoneNumberId, tenant.whatsapp?.displayPhoneNumber ?? '', customerPhone, wamid, text);

  console.log(`Target ${BASE_URL} · tenant ${tenant.slug} (${tenant._id}) · customer +${customerPhone}\n`);

  console.log('1. Webhook handshake and signature enforcement');
  const challenge = `ch_${randomBytes(6).toString('hex')}`;
  const verifyUrl = `${BASE_URL}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${challenge}`;
  const good = await fetch(verifyUrl, { signal: AbortSignal.timeout(30_000) });
  check(good.status === 200 && (await good.text()) === challenge, 'GET challenge echoed with correct verify token');
  const bad = await fetch(verifyUrl.replace(encodeURIComponent(verifyToken), 'wrong-token'));
  check(bad.status === 403, 'GET rejected with wrong verify token', `HTTP ${bad.status}`);
  const forged = await post(body, sign(body, 'not-the-app-secret'));
  check(forged.status === 401, 'POST with forged x-hub-signature-256 rejected', `HTTP ${forged.status}`);

  // Warm the route + DB pool with a signed receipt for an unknown wamid (a no-op),
  // so the timed request below measures steady-state ingestion, not cold start.
  const receipt = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneNumberId }, statuses: [{ id: 'wamid.WARMUP', status: 'read', timestamp: '0' }] } }] }],
  });
  await post(receipt, sign(receipt, appSecret));

  console.log('\n2. Signed inbound message is acknowledged fast');
  const ack = await post(body, sign(body, appSecret));
  check(ack.status === 200, 'HTTP 200 OK', `HTTP ${ack.status}`);
  check(ack.ms < LATENCY_BUDGET_MS, `acknowledged under ${LATENCY_BUDGET_MS}ms`, `${ack.ms}ms`);

  console.log('\n3. Synchronous persistence');
  const lead = await Lead.findOne({ tenantId: tenant._id, phone: customerPhone }).lean();
  check(Boolean(lead), 'Lead upserted with normalised phone', lead ? `+${lead.phone}` : 'missing');
  check(lead?.status === 'new' || lead?.status === 'contacted', 'Lead status initialised', lead?.status);
  check(lead?.profileName === 'Harness Patient', 'WhatsApp profile name captured', lead?.profileName ?? 'missing');

  const inbound = await Message.findOne({ tenantId: tenant._id, waMessageId: wamid }).lean();
  check(Boolean(inbound), 'Inbound Message persisted by waMessageId');
  check(inbound?.direction === 'in' && inbound?.author === 'customer', 'direction "in", author "customer"');
  check(inbound?.status === 'received', 'delivery status "received"', inbound?.status ?? 'missing');
  check(
    inbound?.replyState === 'pending' || Boolean(inbound?.claimedAt),
    'enqueued as replyState "pending"',
    inbound?.replyState === 'pending' ? 'pending' : `already claimed by worker → ${inbound?.replyState}`,
  );

  const dup = await post(body, sign(body, appSecret));
  const copies = await Message.countDocuments({ tenantId: tenant._id, waMessageId: wamid });
  check(dup.status === 200 && copies === 1, 'Meta redelivery is idempotent', `${copies} stored copy`);

  console.log('\n4. Background reply worker (Next.js after())');
  const deadline = Date.now() + WORKER_TIMEOUT_MS;
  let final = inbound;
  while (Date.now() < deadline) {
    final = await Message.findOne({ tenantId: tenant._id, waMessageId: wamid }).lean();
    if (final?.replyState && TERMINAL_STATES.includes(final.replyState)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const state = final?.replyState;
  check(
    Boolean(state && TERMINAL_STATES.includes(state)),
    'worker reached a terminal state (no tenantGuard or runtime crash)',
    state === 'processing' ? 'stuck in "processing" — check server logs' : state,
  );
  check(state === 'done', 'replyState "done"', state === 'done' ? final?.replyNote ?? '' : `${state}: ${final?.replyNote ?? 'no note'}`);

  if (state === 'done') {
    const reply = await Message.findOne({ tenantId: tenant._id, leadId: lead?._id, direction: 'out', author: 'bot' }).lean();
    check(Boolean(reply?.body), 'outbound bot Message persisted', reply?.body?.slice(0, 80));
    const enriched = await Lead.findOne({ tenantId: tenant._id, phone: customerPhone }).lean();
    check(Boolean(enriched?.intent), 'lead enriched by AI extraction', `intent=${enriched?.intent}`);
  }

  // Exact invariant once the worker has settled: redeliveries must not inflate the counter.
  const settled = await Lead.findOne({ tenantId: tenant._id, phone: customerPhone }).lean();
  const stored = await Message.countDocuments({ tenantId: tenant._id, leadId: lead?._id });
  check(settled?.messageCount === stored, 'lead.messageCount matches stored messages', `${settled?.messageCount} vs ${stored}`);

  if (hasFlag('--cleanup') && lead) {
    await Message.deleteMany({ tenantId: tenant._id, leadId: lead._id });
    await Lead.deleteOne({ tenantId: tenant._id, _id: lead._id });
    console.log('\nCleaned up synthetic lead and messages.');
  }

  console.log(`\n${failures === 0 ? 'PASS' : `FAIL — ${failures} check(s) failed`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
