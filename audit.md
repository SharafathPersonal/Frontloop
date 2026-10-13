# FrontLoop: Production-Readiness Audit

**Date:** 2026-10-13
**Scope:** `main` branch including the uncommitted working tree (41 modified files, 9 untracked)
**Method:** line-by-line static review of every route handler, server action, model, worker, client component, public asset and config file; plus `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit --omit=dev`, `npm outdated` and `npm run check:em-dash` executed locally.
**Not covered:** live rendering in a browser (360px checks are from markup and CSS, not screenshots), live Meta/Cashfree/LLM calls, and production database contents. Findings that depend on those are marked **(verify)**.

---

## 1. Executive Summary

The engineering core is genuinely good: tenant isolation, webhook signatures, atomic quota reservation, idempotent payments and the build are all in better shape than most products at this stage. Every tool check is green.

The product is **not ready for paying users** for three reasons that have nothing to do with code quality:

1. **Human takeover is a dead end.** When the bot pauses (staff toggle, the keywords "human", "agent", "call me", or the AI's own handoff flag), nobody is notified and the dashboard has no way to send a reply. The customer gets silence.
2. **The public promise does not match the product.** The landing page, FAQ, pricing cards, Terms and Privacy Policy make claims the code does not support (appointment booking, a 14-day trial, team notifications, fabricated ROI statistics, a "broadcast/credits" Terms page from the old product, and a Privacy Policy that omits the three AI providers that receive customer messages).
3. **Self-healing is not running.** `vercel.json` was removed, so nothing calls the reply sweeper. Any reply that `after()` drops is never retried.

| # | Pillar | Grade | Verdict |
| --- | --- | --- | --- |
| 1 | Landing page, copy & brand truth | **D** | Brand and contacts are consistent; the copy promises features, statistics and a trial that do not exist. |
| 2 | SEO, AEO, GEO & meta | **B** | Solid metadata, sitemap, robots and JSON-LD; missing `FAQPage`/`LocalBusiness`, auth pages have no titles. |
| 3 | Frontend architecture, UI/UX & a11y | **C** | Clean RSC split; brand green fails WCAG AA, no loading states, likely broken sticky header, 720 hardcoded hex values. |
| 4 | PWA & offline | **B+** | Correctly never caches `/api` or page HTML; minor cache-growth and manifest nits. |
| 5 | Backend, routes & API security | **C+** | Strong primitives; logout does not clear the session in production and nothing revokes tokens. |
| 6 | Database isolation & multi-tenancy | **B+** | `tenantGuard` works and every call site complies; the guard's tenant check is too permissive. |
| 7 | Subscription & billing lifecycle | **C** | Idempotency is right; a price change rejects already-paid orders, and a partial failure strands a paid order forever. |
| 8 | WhatsApp ingestion & AI worker | **C+** | Signature, dedupe and quota are correct; handoff dead end, silent LLM failure burns quota. |
| 9 | Sweepers & DevOps | **D+** | Sweeper is unscheduled and unbounded in wall time; stale docs and dead files in the repo root. |
| 10 | Compilation & build | **A** | `tsc`, `lint`, `build`, `npm audit` and em-dash check all pass with zero output. |

---

## 2. Top Ranked Vulnerabilities & Gaps

Severity reflects impact on live paying users, not only security.

### CRITICAL

#### C1. Human takeover leaves the customer with no reply channel and nobody notified

- **Files:** `src/server/reply-worker.ts:104-114` (keyword pause), `src/server/reply-worker.ts:252` (AI-initiated pause), `src/app/dashboard/leads/[id]/lead-conversation-client.tsx` (no composer), `src/server/models/Message.ts:5` (`author: 'agent'` is defined but never written anywhere in `src/`).
- **Failure scenario:** A patient writes "Can you call me about the fee?". The default handoff keyword `call me` matches, `botPaused` is set, and the message is marked `skipped`. No email, push or WhatsApp alert goes to the business. The number is registered on the Cloud API, so staff cannot answer from the WhatsApp Business app either (unless the tenant onboarded via Meta coexistence, which this manual token flow does not do). The lead sits in the dashboard with no reply until someone happens to look, and even then there is no "send" box. This directly contradicts the landing copy ("Staff can take over any chat with one click", `src/app/page.tsx:63`) and the FAQ (`src/components/landing/FaqSection.tsx:25`, `:40`).
- **Remediation:**
  1. Add a server action that sends an agent reply inside the 24-hour window:
     ```ts
     // src/app/dashboard/leads/actions.ts
     export async function sendAgentReplyAction(leadId: string, text: string) {
       const body = z.string().trim().min(1).max(4096).safeParse(text);
       if (!body.success) return { ok: false, error: 'Message must be 1-4,096 characters' } as const;
       return mutateLead(leadId, (repo, id) => repo.sendAgentReply(id, body.data), 'Failed to send message');
     }
     ```
     `repo.sendAgentReply` loads the lead (tenant-scoped), refuses when `Date.now() - lastInboundAt > 24h`, resolves the tenant token via `getTenantByPhoneNumberId`, calls `sendWhatsAppText`, then `Message.create({ ..., direction: 'out', author: 'agent' })`. Agent replies should not consume the AI reply quota.
  2. Add a composer textarea to `lead-conversation-client.tsx` that is enabled only while `lastInboundAt` is within 24 hours.
  3. Notify the owner on every pause: email via Resend (`RESEND_API_KEY` is already in the env schema) or a WhatsApp utility template to an owner-configured number. Add a "Needs human" filter to the leads table (`botPaused: true`, sorted by `lastInboundAt`).
  4. Until 1 to 3 ship, change the default `handoffKeywords` to an empty list and remove "1-click human takeover" from marketing.

### HIGH

#### H1. Logout does not clear the session cookie in production, and no token can be revoked

- **Files:** `src/server/auth/session.ts:16-18`, `src/app/api/auth/logout/route.ts:7-11`, `src/server/auth/jwt.ts:8`.
- **Failure scenario:** In production the cookie is named `__Host-session`. `cookies().delete()` in Next 16.4 serializes `__Host-session=; Path=/; Expires=Thu, 01 Jan 1970` **without** the `Secure` attribute (verified in `node_modules/next/dist/compiled/@edge-runtime/cookies/index.js`, `delete()` and `stringifyCookie()`). Browsers reject any `__Host-` cookie that lacks `Secure`, so the clear is ignored. The user is redirected to `/`, but the 7-day JWT is still in the browser; visiting `/dashboard` logs them straight back in. On a shared clinic front-desk PC this is account takeover. The logout route also never bumps `sessionVersion`, so a stolen token stays valid for its full 7 days.
- **Remediation:**
  ```ts
  // src/server/auth/session.ts
  export async function clearSessionCookie() {
    (await cookies()).set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
  ```
  ```ts
  // src/app/api/auth/logout/route.ts
  const session = await getSession();
  if (session) await User.updateOne({ _id: session.userId }, { $inc: { sessionVersion: 1 } });
  await clearSessionCookie();
  ```
  Bumping `sessionVersion` signs out every device for that user. If per-device logout is wanted, add a `jti` claim and a small revocation collection instead.

#### H2. Changing a plan price rejects orders customers have already paid for

- **Files:** `src/server/billing.ts:70-73`, `src/app/api/webhook/cashfree/route.ts:80-84`, `src/app/api/checkout/verify/route.ts:92-95`.
- **Failure scenario:** A tenant opens checkout for Starter at ₹1,499. You deploy a price change to ₹1,799. The customer completes UPI payment. Both the webhook and the verify call compare `order.amount` (1499) to the **current** `PLAN_CONFIG.starter.priceINR` (1799), return `rejected`, log one `console.error`, and acknowledge Cashfree with 2xx so it never retries. The customer is charged, the plan is not applied, and the UI says "This order cannot be applied to your account". No `Payment` row is written, so there is no record to reconcile from.
- **Remediation:** Persist the quoted order at checkout and validate against that snapshot, not the live config.
  ```ts
  // checkout/route.ts, after Cashfree returns payment_session_id
  await Payment.create({ _id: orderId, tenantId, plan, amountINR: planInfo.priceINR, status: 'pending' });
  ```
  ```ts
  // billing.ts fulfilPaidOrder
  const pending = await Payment.findOneAndUpdate(
    { _id: order.orderId, tenantId, status: 'pending', amountINR: order.amount },
    { $set: { status: 'applying', source: order.source } },
    { returnDocument: 'after' },
  );
  if (!pending) return (await Payment.exists({ _id: order.orderId, tenantId, status: 'applied' }))
    ? { status: 'duplicate' } : { status: 'rejected', reason: 'No matching pending order' };
  ```
  Then apply the plan using `pending.plan` and the quota from a `planSnapshot` stored on the row. Alert (email or a dashboard banner for platform admins) on every `rejected` result.

#### H3. A transient error after the Payment insert strands a paid order permanently

- **File:** `src/server/billing.ts:79-97`.
- **Failure scenario:** `Payment.create` succeeds, then `BusinessTenant.updateOne` throws (Atlas failover, socket timeout). The webhook returns 500, Cashfree retries, `Payment.create` now hits E11000 and returns `duplicate`. The verify path also returns 409, which the client shows as **"Payment confirmed. Your plan is active."** (`billing-settings-client.tsx:107`). The plan was never applied and every retry path now reports success.
- **Remediation:** Wrap both writes in a transaction (Atlas is a replica set, per `.env.local.example:12-13`):
  ```ts
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Payment.create([{ _id: order.orderId, tenantId, plan, amountINR: order.amount, source: order.source, periodEnd }], { session });
      const res = await BusinessTenant.updateOne({ _id: tenantId }, { $set: { /* ... */ } }, { session });
      if (res.matchedCount === 0) throw new TenantMissingError();
    });
  } finally {
    await session.endSession();
  }
  ```
  With H2's state machine (`pending -> applying -> applied`) a non-transactional retry is also safe: treat `applying` as retryable.

#### H4. Marketing makes claims the product does not deliver

Indian consumer-protection rules (Consumer Protection Act 2019 and the CCPA 2022 guidelines on misleading advertisements) apply to B2B SaaS sold to small businesses. Each line below is a concrete mismatch:

| Claim | Location | Reality in code |
| --- | --- | --- |
| "Misses 40% of Inquiries After 7 PM" | `src/app/page.tsx:122` | Unsourced statistic. |
| "books appointments" | `src/app/page.tsx:127` | No booking, calendar or slot-locking logic exists. |
| ROI stats "74%", "3.4x", "22 hrs", "100%" | `src/components/landing/IndustryVerticalsSection.tsx:37,58,79,100` | Fabricated; there are no customers to measure. |
| "Every vertical comes pre-configured with industry-specific ... guardrails" | `IndustryVerticalsSection.tsx:131` | `category` is only a word in the system prompt (`ai-pipeline.ts:68`). |
| Capabilities: location pin dispatch, brochure dispatch, slot locking, deposit payments, reminders, pickup coordination | `IndustryVerticalsSection.tsx:40-106` | Bot sends plain text only (`meta-graph.ts:34-43`). |
| Demo chat: "Confirmed for Anjali Nair!" | `src/components/landing/WhatsAppDemoSimulator.tsx:45` | Implies a booking was made. |
| "preferred slot are extracted" | `src/app/page.tsx:59`, `public/llms.txt:18` | Parser only extracts name, requirement, intent (`ai-pipeline.ts:141-147`); `Lead` has no slot field. |
| "Leads flow into your pipeline in real time" | `src/app/page.tsx:63` | Dashboard is server-rendered; no polling or push. |
| "notifies your team for follow-up" | `FaqSection.tsx:40` | No notification exists (see C1). |
| "zero account ban risk", "Never" | `FaqSection.tsx:20` | Meta can and does restrict Cloud API numbers for policy or quality violations. |
| "Zero Hallucinations" | `src/app/page.tsx:27`, `layout.tsx:10` | Prompt rules reduce, not eliminate, hallucination. |
| "Start 14-Day Free Evaluation" | `PricingSection.tsx:81`, `settings/page.tsx:42` | Trial never expires (see M1). |
| "Priority Multi-Tier Engine (Gemini 1.5 + Groq LLaMA)" as a Growth feature | `PricingSection.tsx:123` | All plans use the same engine; model is `gemini-2.5-flash` (`ai-pipeline.ts:5`). |
| "AI Conversations per month" | `PricingSection.tsx:55,119` | Quota counts **replies**, not conversations (`reply-worker.ts:135`). A 10-message chat uses 10. |
| "Done-for-you catalog setup included" | `PricingSection.tsx:147` | An operational promise with no process behind it; confirm you will do this manually. |
| "Staff can toggle 'botPaused'" | `page.tsx:289`, `FaqSection.tsx:25` | Leaks an internal field name into copy. |

- **Remediation:** Rewrite to what ships today: "answers questions from your knowledge base", "captures name and requirement", "pauses for your team". Remove all four ROI stats and the 40% headline, or replace them with clearly labelled illustrative examples. Replace "Zero Hallucinations" with "Answers only from your knowledge base". Change "Conversations" to "AI replies" everywhere.

#### H5. Terms of Service describe the deprecated product; Privacy Policy misstates data flows

- **Files:** `src/app/terms/page.tsx:22,29,36`, `src/app/privacy/page.tsx:29,36`.
- **Failure scenario:** The Terms talk about "customer contact lists prior to broadcast", "Credits ... carry zero expiration locks" and an `is_blocked` flag. FrontLoop has no broadcasts, no credits, a quota that **does** expire every 30 days (contradicting the refund policy), and no `is_blocked` field. The Privacy Policy says data is "strictly channeled to Meta Cloud API endpoints", but every customer message and the business knowledge base are sent to Google (Gemini), Groq and Cerebras (`ai-pipeline.ts:154-212`). This is a false statement under India's DPDP Act 2023. Cashfree merchant KYC and Meta App Review both check these pages; a reviewer will see a policy for a different product.
- **Remediation:** Rewrite both pages. Privacy must list: data collected (business account data, end-customer phone, profile name, message content), purposes, processors (MongoDB Atlas and region, Vercel, Meta, Google, Groq, Cerebras, Cashfree, Resend when enabled), retention periods, the end-customer data flow (the business is the data fiduciary, FrontLoop the processor), a grievance officer contact as DPDP requires, and deletion requests. Terms must cover the subscription model, 30-day quota expiry, acceptable use under the WhatsApp Business Policy, AI output disclaimer, liability cap and governing law (Kerala courts). Have a lawyer review before launch.

#### H6. The reply sweeper is not scheduled anywhere and has no wall-time bound

- **Files:** `src/app/api/cron/reply-sweeper/route.ts:57-106`, commit `72ffcd1` (removed `vercel.json`), `.env.local.example:42-43` (still says "Vercel Cron sends it automatically").
- **Failure scenario:** The webhook processes a burst sequentially inside one `after()` (`whatsapp/webhook/route.ts:266-279`). Each message can take roughly 40 seconds in the worst case (three 10-second LLM timeouts plus a 10-second Meta send). A burst of 5 to 10 messages exceeds the function's max duration, the instance is killed, and the remaining messages stay `pending` forever because nothing calls the sweeper. When it is eventually called, it processes up to 50 messages serially with no deadline (`:57-63`, `:71-106`), so it times out too, and messages killed mid-flight sit in `processing` until the next run.
- **Remediation:**
  1. Schedule it now: cron-job.org or an Upstash QStash schedule every 1 to 2 minutes with the `Authorization: Bearer $CRON_SECRET` header. (GitHub Actions cron is too coarse at a 5-minute minimum and best-effort timing.) Document the chosen scheduler in the README.
  2. Bound it:
     ```ts
     export const maxDuration = 60;
     const deadline = Date.now() + 45_000;
     for (const msg of pendingMessages) {
       if (Date.now() > deadline) break;
       // ...
     }
     ```
     and lower `.limit(50)` to about 10.
  3. In the webhook, schedule one `after()` per message (they run concurrently) instead of one sequential loop, since the per-message claim is already atomic.
  4. Fix the stale `.env.local.example` comment.

#### H7. LLM outages silently degrade every reply to a canned message and still charge quota

- **Files:** `src/server/ai-pipeline.ts:276-282`, `src/server/reply-worker.ts:223-232`.
- **Failure scenario:** A provider deprecates a model ID (`gemini-2.5-flash`, `llama-3.3-70b-versatile`, `llama3.3-70b` are hardcoded) or an API key is revoked. All three tiers fail, the fallback string "Thanks for reaching out! Our team will get back to you shortly." is sent, the reservation is kept, and the message is marked `done`. The business pays quota for canned replies, sees nothing wrong in the dashboard, and only `console.warn` lines exist in Vercel logs. Combined with C1, nobody gets back to the customer.
- **Remediation:** When `providerUsed === 'fallback'`, release the quota (`releaseQuota()`), set `replyNote: 'AI unavailable: fallback sent'`, and increment a tenant-visible counter. Emit a single `console.error` with a stable tag (`[AI_DOWN]`) and wire a Vercel log drain alert on it. Move model IDs to env vars with defaults so a deprecation is a config change, not a deploy. **(verify)** that all three model IDs are still served by their providers as of today.

### MEDIUM

| # | Finding | File:line | Failure scenario | Fix |
| --- | --- | --- | --- | --- |
| M1 | Trial never expires; UI says "14-day" | `src/app/api/auth/register/route.ts:48`, `src/server/reply-worker.ts:132`, `settings/page.tsx:42` | Trials have no `currentPeriodEnd`, so the reservation's `currentPeriodEnd: null` branch lets a trial run forever until its 300 replies are used. | On register set `subscription.currentPeriodEnd: new Date(Date.now() + 14 * 864e5)`. Render the real end date in Settings. |
| M2 | Inbound insert errors are swallowed and acknowledged | `src/app/api/whatsapp/webhook/route.ts:248-258` | A transient DB error on `Message.create` is logged and the webhook still returns 200. Meta does not redeliver, so the customer's message is lost. `lastInboundAt` was already bumped. | On a non-E11000 error, return 500 at the end of the handler. Redelivery is safe because `waMessageId` is unique. |
| M3 | CSP allows inline scripts | `next.config.ts:7` | `script-src 'unsafe-inline'` means any injected markup can execute, so the CSP provides no XSS defence. | Generate a per-request nonce in `src/proxy.ts`, pass it via header, apply to the JSON-LD script, and drop `'unsafe-inline'`. Move the `offline.html` inline handler into a file. |
| M4 | Brand green fails WCAG AA | `src/app/globals.css:18,106-126`; 89 uses of `#0AAF76` | White on `#0AAF76` is **2.84:1** (needs 4.5:1). Used by `.btn-primary` (login and register submit), the Growth CTA, tab pills, links, `not-found`, `CustomConfirm`. White on `#25D366` (`dashboard/support/page.tsx:36`) is **1.98:1**. | Use `#047857` (5.48:1) for any white-text background and for green text on white. For WhatsApp-green buttons use dark text (`#0B1120`), as the landing banner already does. |
| M5 | Landing sticky header likely does not stick | `src/app/page.tsx:69`, `src/app/layout.tsx:116` | `overflow-x-hidden` makes the wrapper a scroll container, so `position: sticky` binds to a box that never scrolls. It also hides horizontal overflow rather than fixing it. **(verify in browser)** | Replace with `overflow-x-clip` on both elements. |
| M6 | Mobile nav drawer is a keyboard trap in reverse | `src/app/dashboard/dashboard-shell.tsx:140-154` | When closed, the drawer is hidden with opacity and `pointer-events-none` only, so its links stay in the tab order on mobile. When open: no Escape, no focus trap, close button has no `aria-label`. | Add `inert={!sidebarOpen}` to the overlay, `aria-label="Close navigation menu"`, an Escape handler and initial focus. |
| M7 | No password recovery; per-email lockout enables denial of service | `src/app/api/auth/forgot-password/route.ts:16-19`, `src/app/api/auth/login/route.ts:29-32` | Anyone who knows an owner's email can send 5 bad passwords every 15 minutes and keep them locked out. A forgotten password requires manual support with no tooling. | Ship reset via Resend (hash the token, 30-minute expiry, bump `sessionVersion`). Count only failed attempts per email, and include IP in that key so one attacker cannot lock out a victim. |
| M8 | `tenantGuard` accepts any non-null `tenantId` | `src/server/models/plugins/tenant-guard.ts:20,39-45` | `{ tenantId: { $ne: null } }` or `{ tenantId: { $exists: true } }` passes and reads every tenant. `$lookup` stages after the first `$match` are unchecked. `tenantId` is not `immutable`, so a future `$set: input` could move a document between tenants. No current call site does this; the guard just will not stop the first one that does. | Accept only an `ObjectId` or a 24-hex string: `const t = obj?.tenantId; return t instanceof Types.ObjectId \|\| (typeof t === 'string' && /^[a-f0-9]{24}$/.test(t));`. Reject `$lookup`/`$unionWith` without `crossTenant`. Add `immutable: true` to `tenantId` in `Lead`, `Message`, `KnowledgeBase`, `Payment`. |
| M9 | Two sources of truth for plans | `src/server/models/BusinessTenant.ts:4,33`, `src/lib/plans.ts:2-18`, `settings/page.tsx:63` | Adding a plan key to `PLAN_CONFIG` without updating `SUBSCRIPTION_PLANS` writes an off-enum value (updates do not run validators). Trial quota `300` is hardcoded twice. | Derive `SUBSCRIPTION_PLANS = ['trial', ...Object.keys(PLAN_CONFIG)]` and add a `TRIAL` entry (quota, days) to `plans.ts`. |
| M10 | Pricing section omits Pro | `src/components/landing/PricingSection.tsx:8` | Landing shows 2 plans; JSON-LD (`layout.tsx:93-95`), `llms.txt` and Settings show 3. Search engines advertise ₹7,999 that no landing card explains. | Map over `PLAN_CONFIG` (with per-plan feature arrays in `plans.ts`) instead of destructuring two keys. |
| M11 | Early renewal forfeits paid days | `src/server/billing.ts:77` | Renewing on day 25 sets a new period from now; 5 paid days are lost. Disclosed in Settings, but not in the refund policy. | `periodEnd = max(now, currentPeriodEnd) + 30 days` for same-plan renewals. |
| M12 | No loading or root error UI | `src/app/**` (no `loading.tsx`, no `global-error.tsx`); `src/app/error.tsx:35` | Dashboard navigations show a frozen page while Mongo queries run. A root-layout error has no boundary. `error.tsx` prints raw `error.message` with alarming copy ("critical rendering fault"). | Add `src/app/dashboard/loading.tsx` (skeleton) and `src/app/global-error.tsx`. Show `error.digest` only. |
| M13 | Graph API version lifecycle **(verify)** | `src/server/env.ts:21`, `.env.local.example:39` | `v21.0` was released in October 2024 and Meta retires versions about two years after release, so it is at or near end of life now. Calls are then served by the oldest available version, which can change behaviour without notice. The landing trust strip advertises "Meta Cloud API v21". | Check the Graph API changelog today, bump `GRAPH_API_VERSION`, and stop putting a version number in marketing copy. |

### LOW

| # | Finding | File:line | Fix |
| --- | --- | --- | --- |
| L1 | Hydration risk: `toLocaleString('en-IN')` in client components; ICU output differs between Node and browsers (`pm` vs `PM`, narrow spaces). `suppressHydrationWarning` on `<body>` masks it. | `lead-conversation-client.tsx:194,262`, `leads-table-client.tsx:310`, `layout.tsx:116` | Format on the server and pass strings, or render inside `<time>` after mount. Remove the body-level suppression. |
| L2 | Message timestamps show time only; multi-day threads are ambiguous. | `lead-conversation-client.tsx:194-198` | Add day separators or include the date. |
| L3 | Tenant cache is per instance for 60 s; a disconnect or bot-off toggle takes up to 60 s on other instances; a failed decrypt is cached as an empty token. | `src/server/tenant-resolver.ts:18,49-59` | Cache only successful decrypts; cut TTL to 15 s, or store `updatedAt` and compare. |
| L4 | Non-text messages reach the LLM as `[image message]`; interactive and button replies lose their payload. | `whatsapp/webhook/route.ts:215-219` | Extract `interactive.button_reply.title`, `button.text`, image `caption`; for voice and media send a fixed "please type your question" reply without LLM cost. |
| L5 | Server actions return raw `err.message` (Mongo or guard errors) to the browser. | `src/app/dashboard/leads/actions.ts:32` | Log the error and return `fallbackError`. |
| L6 | Accessibility gaps: FAQ buttons lack `aria-expanded`/`aria-controls`; industry tabs lack `role="tablist"`/`aria-selected`; toasts have no `aria-live` and an unlabeled close button; `CustomConfirm` has no Tab trap. | `FaqSection.tsx:76`, `IndustryVerticalsSection.tsx:141`, `ToastContext.tsx:42,66`, `CustomConfirm.tsx:41-61` | Add the ARIA attributes; wrap toasts in `role="status" aria-live="polite"`; trap Tab inside the dialog. |
| L7 | `animate-in`, `zoom-in-95`, `slide-in-from-bottom-4` are no-ops (no `tw-animate-css` plugin). | `CustomConfirm.tsx:68`, `ToastContext.tsx:46` | Install `tw-animate-css` or delete the classes. |
| L8 | Design tokens are defined but unused: 720 hardcoded `[#hex]` utilities, zero `var(--brand-*)` in components; two competing primaries (`#0AAF76` x89, `#047857` x30). | `globals.css:12-22` | Move tokens into `@theme` (`--color-brand: #047857`) and replace literals with `bg-brand`, `text-brand`. |
| L9 | Google Fonts loaded with a CSS `@import`: render-blocking and a third-party request on every page. | `globals.css:1` | Use `next/font/google` (self-hosted, no layout shift); drop the preconnects and the CSP font hosts. |
| L10 | Auth pages are whole-page client components, so they inherit the landing title; `/dashboard/support` has no title. | `src/app/auth/*/page.tsx`, `src/app/dashboard/support/page.tsx` | Move forms into client children and export `metadata` from server `page.tsx`. Add `robots: { index: false }` to auth pages. |
| L11 | Sitemap `lastModified` is always the build time, which tells crawlers every page changed. | `src/app/sitemap.ts:13` | Use fixed per-page dates. |
| L12 | Checkout sends `customer_phone: '9999999999'` when no WhatsApp number is connected. | `src/app/api/checkout/route.ts:52` | Collect the owner's phone at registration. |
| L13 | `handoffKeywords` and `languages` arrays are unbounded; a one-letter keyword pauses the bot on almost every message. | `src/server/repos/tenant.ts:53,58` | `z.array(z.string().trim().min(3).max(40)).max(20)`. |
| L14 | `x-forwarded-for` trusted for rate limiting; safe on Vercel (which overwrites it), spoofable anywhere else. | `src/server/http.ts:10-12` | Use `ipAddress(req)` from `@vercel/functions` (already a dependency). |
| L15 | `staff` and `platform_admin` roles exist with no invite flow and no `/admin` route. | `src/server/models/User.ts:3`, `src/proxy.ts:13` | Ship staff invites or drop the role until needed. |
| L16 | Two public URLs for the same webhook. | `src/app/api/webhook/whatsapp/route.ts:1` | Keep one; document which is registered in Meta. |
| L17 | Register says "you agree to our terms of service" without a link or privacy notice. | `src/app/auth/register/page.tsx:221` | Link `/terms` and `/privacy`. |
| L18 | SW runtime cache grows without bound (old hashed chunks kept until `CACHE` is renamed); manifest forces `portrait` on tablets. | `public/sw.js:45-50`, `src/app/manifest.ts:12` | Cap entries or version the cache per deploy; drop `orientation`. |
| L19 | Dead weight in repo root: `mvp.md` (dead-stock marketplace, "True Attendly"), `sample.md` (invoice PDF work), `lint_errors.txt` (paths from another project), boilerplate `README.md`. Env example lists unused `NEXT_PUBLIC_DEMO_WHATSAPP_NUMBER`, `META_APP_ID`. `docs/product_truth.md:21` still says "Gemini 1.5 Flash". | repo root, `.env.local.example:30,68`, `docs/product_truth.md:21` | Delete the three files, write a real README (setup, env, cron, deploy), sync `product_truth.md`. |

---

## 3. Pillar-by-Pillar Deep Dive

### Pillar 1: Landing Page, Marketing Copy & Brand Truth (D)

**What is right**
- Brand is consistently "FrontLoop". The only remaining "attendly" strings in `src/` and `public/` are the support email `trueattendly@gmail.com`, which is the intended address. Legacy names survive only in `mvp.md`, `sample.md` and `AGENTS.md` (as a prohibition).
- Contact details are centralised in `src/lib/config.ts:6-17` and used by the footer, support page, JSON-LD and `whatsappLink()`. Email, phone (`+91 9400160928`), WhatsApp deep link (`wa.me/919400160928`), and "Calicut, Kerala, India" are identical everywhere. The only duplication is the JSON-LD `telephone: '+91-9400160928'` literal (`layout.tsx:68,74`); derive it from `CONTACT`.
- The fabricated "99.98% uptime" bar was removed (per changelog). No lorem ipsum or placeholder text remains.
- CTAs work: "Free Trial" and "Start Free Trial" go to `/auth/register`; the demo opens WhatsApp in a new tab with `rel="noopener noreferrer"`.

**What is wrong**
- See H4 for the full claims table and H5 for legal pages. The single largest issue is that the copy sells an appointment-booking product; the code is a Q&A and lead-capture bot.
- **(verify)** The "Live WhatsApp Demo" CTA sends prospects to `+91 9400160928`, which is also the support number. Confirm that number is connected to a FrontLoop tenant with a demo knowledge base; otherwise prospects reach a human and the "watch it reply in seconds" banner (`page.tsx:229`) is untrue. Using the same number for demo and support also means support chats get AI replies.
- Copy tone: "Workspace Execution Failed", "404 - ROUTE UNCHARTED", "System Logout" read as developer jargon to a clinic receptionist.
- Footer copyright year is hardcoded (`GlobalFooter.tsx:131`).

**360px responsiveness (static review)**
- Header: logo, "Sign In" and "Free Trial" use `gap-1 px-2 text-[11px] whitespace-nowrap`; should fit 360px.
- Hero `h1` is `text-[1.75rem]`; 4 trust items wrap via `flex-wrap`.
- Industry tabs scroll horizontally inside `overflow-x-auto` (intentional).
- Any overflow is hidden, not fixed, by `overflow-x-hidden` on `<body>` and the page wrapper (M5). Run Chrome DevTools at 360px with that class removed to find the real offender.

### Pillar 2: SEO, AEO, GEO & Meta Tags (B)

- `metadataBase: new URL('https://frontloop.online')` (`layout.tsx:20`, via `SITE_URL`). OpenGraph (`en_IN`, 1200x630 `og-image.png` exists in `public/images/`) and Twitter `summary_large_image` are complete.
- Canonicals declared on `/`, `/support`, `/privacy`, `/terms`, `/refund-policy`. No `title.template`, so each page repeats `| FrontLoop` by hand; acceptable.
- `robots.txt` is valid; it disallows `/dashboard/`, `/api/`, `/admin/` and points to the sitemap. Note `Disallow: /dashboard/` does not match the bare `/dashboard` path (harmless; it redirects).
- `sitemap.ts` covers all 5 public pages; see L11 for `lastModified`.
- JSON-LD: `Organization` and `SoftwareApplication` with `AggregateOffer` derived from `PLAN_CONFIG`; `<` is escaped against script breakout (`layout.tsx:113`). Missing:
  - `FAQPage` for the 6 FAQs (highest-value AEO gain; answer engines quote these directly). Fix the overclaims first.
  - `LocalBusiness` (or `ProfessionalService`) with `geo`, `openingHours` and `areaServed: Calicut`, which you explicitly target in keywords.
  - `sameAs` links (LinkedIn, Instagram, Google Business Profile) once they exist.
- `llms.txt` / `llms-full.txt`: architecture section is accurate (Next.js 16, Graph API v21.0, MongoDB, `after()` plus sweeper, AES-256-GCM, Cashfree). No stale "Broadcast" references remain. Inaccuracies: "for example a preferred appointment slot" is extracted (`llms.txt:18`, `llms-full.txt:18`), it is not; "appointments" in `llms-full.txt:17`. Both files hardcode plan prices (see Section 4).
- Auth pages are indexable and untitled (L10).

### Pillar 3: Frontend Architecture, UI/UX, Themes & Design (C)

**RSC boundary:** Good. Data loads in server `page.tsx` files through `forTenant()` and only serialised plain objects cross into `'use client'` islands (`leads/page.tsx:38-50`, `leads/[id]/page.tsx:94-114`). No server module is importable from client code (`server-only` everywhere). Exception: the three auth pages are entirely client components (L10).

**Error and loading states:** No `loading.tsx` anywhere and no `global-error.tsx` (M12). Server action failures in the lead view are silent: `handleToggleBot` and `handleStatusChange` (`lead-conversation-client.tsx:63-79`) ignore `res.error`, and notes saving shows nothing on failure.

**Hydration:** See L1. Dates rendered in server components (`dashboard/page.tsx:180`, `settings/page.tsx:34`) correctly pass the tenant `timeZone`; client components do too, but ICU differences remain.

**Tailwind v4:** `@import "tailwindcss"` with `@theme` for the font only. Component classes are correctly in `@layer components` so utilities override them. Tokens in `:root` are unused by components (L8). Animation classes from an uninstalled plugin (L7).

**Contrast (computed WCAG ratios):**

| Pair | Ratio | AA normal text |
| --- | --- | --- |
| White on `#0AAF76` (btn-primary, Growth CTA, tabs, confirm button) | 2.84 | Fail |
| `#0AAF76` on `#ECFDF5` (section badges) | 2.69 | Fail |
| White on `#25D366` (dashboard WhatsApp button) | 1.98 | Fail |
| White on `#089163` (hover) | 4.01 | Fail |
| White on `#047857` (header CTA, billing buttons) | 5.48 | Pass |
| `#64748B` on `#F8FAFC` (body muted text) | 4.55 | Pass (barely) |

**Forms and labels:** Login, register, WhatsApp settings, leads search and lead status all use `htmlFor`/`id` correctly. The knowledge base uses `aria-label` plus `aria-invalid`/`aria-describedby` on dynamic rows: good. Billing progress bars have proper `role="progressbar"` attributes.

**Modals and keyboard:** `CustomConfirm` has `role="dialog"`, `aria-modal`, labelled title, Escape, focus restore; missing Tab trap. Mobile drawer has the issues in M6.

### Pillar 4: PWA & Offline (B+)

- `src/app/manifest.ts`: `name`, `short_name`, `description`, `id`, `start_url: /dashboard`, `scope: /`, `display: standalone`, `theme_color #047857`, `background_color`, icons 192, 512 and a 512 maskable. All three icon files exist and have the declared dimensions. `apple-icon.png` (180x180) and `icon.png` are present.
- `public/sw.js`: skips non-GET, cross-origin and every `/api/*` request; navigations (including `/dashboard`) are always network-first with only `offline.html` as fallback; only `/_next/static/`, `/icons/`, `/images/` are cached. **No authenticated HTML or API data can be served stale.** This meets the requirement.
- `/sw.js` is served `no-cache, no-store` (`next.config.ts:36-40`); registration is production-only and after `load`.
- Nits: L18 (unbounded cache, forced portrait). `icon-512.png` is 226 KB and `logo.png` 1.2 MB; compress both. `OfflineBanner` says "Changes will be available when you reconnect", but nothing is queued offline; say "Reconnect to load your leads".

### Pillar 5: Backend Architecture, Routes & API Security (C+)

**Route inventory and controls**

| Route / action | Auth | Same-origin | Rate limit | Zod | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST /api/auth/login` | n/a | Yes | IP 30/15m, email 5/15m | Yes | Constant-time dummy hash prevents user enumeration. See M7. |
| `POST /api/auth/register` | n/a | Yes | IP 5/h | Yes | Compensating deletes on failure. No email verification. |
| `POST /api/auth/logout` | none | Yes | No | n/a | **H1** |
| `POST /api/auth/forgot-password` | n/a | Yes | IP 3/15m | n/a | Returns 501. |
| `POST /api/auth/reset-password` | n/a | No | No | n/a | Returns 501. |
| `GET/POST /api/auth/callback/facebook` | n/a | n/a | n/a | n/a | Returns 501. Meta App Review requires a working data-deletion callback. |
| `POST /api/checkout` | owner | Yes | No | Yes | Fine; consider 5/min per tenant. |
| `POST /api/checkout/verify` | owner | Yes | No | Yes | Order bound to session tenant. |
| `POST /api/webhook/cashfree` | HMAC | n/a | n/a | Yes | Timing-safe, 5-minute replay window. |
| `GET/POST /api/whatsapp/webhook` | HMAC / verify token | n/a | n/a | Manual typing | Timing-safe, fails closed on missing secret. |
| `GET /api/cron/reply-sweeper` | Bearer | n/a | n/a | n/a | `safeEqual` hashes both sides first. |
| `GET /api/leads/export` | owner, staff | GET | No | status enum | CSV formula injection neutralised. |
| Lead actions | owner, staff | Next built-in | No | Yes | L5 |
| Knowledge actions | owner, staff | Next built-in | sandbox 20/min | Yes | |
| Settings actions | owner | Next built-in | connect 10/15m | Yes | Live Meta handshake before storing token. |

**Crypto:** AES-256-GCM with 96-bit random IV and auth tag, versioned blob (`crypto.ts:10-23`). All secret comparisons use `timingSafeEqual` (`crypto.ts:29-87`). bcrypt cost 12. `getEnv()` throws on malformed config; `requireEnv()` fails closed for optional integrations. Access tokens are `select: false` and only selected explicitly.

**Sessions:** HS256 JWT with issuer and audience, 7-day TTL, `httpOnly`, `SameSite=Lax`, `__Host-` prefix in production. `getSession()` re-reads role, tenant, `disabled` and `sessionVersion` from the DB on every request, so demotions apply immediately. Gaps: H1, and no session-version bump exists anywhere in the codebase.

**Headers (`next.config.ts`):** HSTS 2 years with `includeSubDomains; preload` (be sure every subdomain is HTTPS before submitting to the preload list), `X-Frame-Options: DENY` plus `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`, `Permissions-Policy` for camera, microphone, geolocation, `poweredByHeader: false`. CSP weakened by `'unsafe-inline'` (M3).

### Pillar 6: Database Isolation & Multi-Tenancy (B+)

- `tenantGuard` hooks every query op, `aggregate`, `insertMany` and `bulkWrite` on `Lead`, `Message`, `KnowledgeBase`, `Payment` (`tenant-guard.ts:30-58`). `findById` on those models throws by design.
- **Every call site complies.** The repo layer (`server/repos/tenant.ts`) builds every filter from the session's `tenantObjectId`; the worker scopes by tenant; the only `crossTenant: true` uses are the three sweeper queries (`reply-sweeper/route.ts:48,54,64`), each of which is legitimately cross-tenant.
- `BusinessTenant` and `User` are intentionally unguarded root models; every access to them is keyed by the session's own IDs or the signed webhook's `phone_number_id`.
- Weaknesses are latent, not exploited: M8.

**Indexes:** Well designed for the query shapes.

| Collection | Index | Serves |
| --- | --- | --- |
| Lead | `{tenantId, phone}` unique | webhook upsert, phone-prefix search |
| Lead | `{tenantId, status, lastMessageAt -1, _id -1}` and unfiltered twin | cursor pagination |
| Lead | `{tenantId, createdAt -1}` | CSV export |
| Message | `{waMessageId}` unique partial | idempotency |
| Message | `{tenantId, leadId, createdAt -1}` | history, timeline, burst check |
| Message | `{replyState, createdAt}` partial on pending/processing | sweeper |
| BusinessTenant | `whatsapp.phoneNumberId` unique partial | routing, one number per tenant |
| RateLimit | TTL on `expiresAt` | auto-expiry |

Pagination is keyset on `(lastMessageAt, _id)` with a strict, validated cursor (`tenant.ts:96-104`). One gap: `countDocuments` runs on every page load; fine at SMB scale.

`autoIndex` is off in production; `npm run db:indexes` must run on every deploy that changes an index. Add it to the deploy checklist.

### Pillar 7: Subscription, Billing Lifecycle & Pricing Sync (C)

- **Strong:** order IDs are 128-bit random; order tags are re-validated with zod; verify is bound to the session tenant; the `Payment` insert keyed by `order_id` makes the webhook and verify paths idempotent and race-safe against each other; `CASHFREE_ENV` is explicit so previews cannot hit live payments; fulfilment resets `repliesUsed` to 0 and sets a fresh 30-day `currentPeriodEnd`; lapsed periods stop replies through the reservation filter.
- **Weak:** H2 (price drift), H3 (partial failure), M1 (trial), M9 (enum drift), M10 (Pro hidden on landing), M11 (renewal forfeits days).
- There is no expiry reminder. Plans do not auto-renew, so every customer churns silently on day 30 unless they remember. Add an email or dashboard banner 5 days and 1 day before `currentPeriodEnd`.
- `subscription.status` never moves to `past_due` or `canceled`; it stays `active` forever and the UI infers "expired" from the date. Acceptable, but a daily job (or lazy update on read) would make reporting honest.
- Full trace in Section 4.

### Pillar 8: WhatsApp Ingestion Pipeline & AI Reply Worker (C+)

**Ingestion (`src/app/api/whatsapp/webhook/route.ts`)**
- HMAC-SHA256 over the raw body with `timingSafeEqual` and length check (`:51-59`; `crypto.ts:38-60`). Missing `META_APP_SECRET` throws, so unsigned payloads are never accepted.
- Deduplication: unique partial index on `waMessageId`; E11000 is treated as redelivery (`:248-258`). `messageCount` is incremented only after a successful insert.
- Lead upsert uses `$max` for timestamps so out-of-order delivery is safe.
- Delivery receipts are monotonic (`:149-169`).
- Gaps: M2 (swallowed errors), L4 (non-text), H6 (sequential `after()`).

**Worker (`src/server/reply-worker.ts`)**
- Atomic claim `pending -> processing` with attempt counter, given up after 3 (`:42-60`).
- Cheap gates run before spending quota: tenant, bot enabled, lead paused, 24-hour window, burst coalescing (newest message wins), handoff keywords (Unicode-aware boundary, works for Malayalam and Devanagari), then rate limits.
- Quota reservation is a single conditional `$inc` with `$expr: repliesUsed < replyQuota` plus status and period checks (`:128-140`): concurrent workers cannot overshoot. Release is exactly-once via the `quotaHeld` flag, including on exceptions; a delivered reply is marked `done` before bookkeeping so the sweeper can never double-send.
- Meta error `190` flips the tenant to `whatsapp.status: 'error'`, which drives the dashboard banner.

**AI pipeline (`src/server/ai-pipeline.ts`)**
- Tiering: Gemini `gemini-2.5-flash` (key in header, not URL), then Groq, then Cerebras, then the tenant's fallback text. Each call has a 10-second `AbortSignal.timeout`.
- Prompt-injection defences: real multi-turn roles, customer text wrapped in `<customer_message>` with forged delimiter tags stripped (`:49-51`), profile name neutralised, explicit rules that customer text is data and that prices and policies may only come from `<business_data>`. Output is JSON-mode, parsed defensively, length-capped, intent whitelisted.
- Business hours: open/closed is computed in code in the tenant time zone and handed to the model, not left to LLM arithmetic. Good.
- Gaps: H7 (silent fallback), C1 (handoff dead end). The `email` and `preferred_time` capture fields are requested in the prompt but never parsed or stored.

### Pillar 9: Background Sweepers & DevOps (D+)

- Sweeper auth is correct (`safeEqual` on the full `Bearer` string; `requireEnv` fails closed). Its three phases are sound: reset stale `processing` after 2 minutes, expire `pending` past 24 hours, replay orphans older than 10 seconds.
- **It is not scheduled** and **not time-bounded** (H6).
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm outdated`: only patch and minor drift. Worth taking now: `mongoose 9.11.2`, `zod 4.6.7`, `@vercel/functions 3.9.11`, `tailwindcss 4.3.3`. Hold: `react 19.3.0` (minor; test first), `framer-motion 14` (major, and **unused**: no import in `src/`; remove it), `typescript 7` (major).
- `.env.local.example` vs `src/server/env.ts`: every schema variable is documented. Drift: `NEXT_PUBLIC_DEMO_WHATSAPP_NUMBER` is documented but unused; `META_APP_ID` and `RESEND_API_KEY` are validated but unused; the cron comment is stale (H6). `GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY` are all optional, so production can boot with none and reply with the canned fallback forever; require at least one when `NODE_ENV=production`.
- No error monitoring (Sentry or similar) and no uptime check on `/api/whatsapp/webhook`. For a product whose value is "never miss a message", add both.
- README is the create-next-app boilerplate and still mentions the Geist font.

### Pillar 10: Local Compilation & Build Diagnostics (A)

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Exit 0, no output |
| `npm run lint` | Exit 0, no warnings |
| `npm run check:em-dash` | Exit 0, no matches |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run build` (Next.js 16.4.0, Turbopack) | Exit 0. 33 routes: 13 static (`/`, auth pages, legal pages, `/support`, `sitemap.xml`, `manifest.webmanifest`, icons), 20 dynamic (all `/api/*` and `/dashboard/*`). Proxy (middleware) compiled. |

The landing page prerenders as fully static, which is ideal for SEO and TTFB. `lint_errors.txt` in the repo root is from a different project and does not reflect the current state; delete it.

---

## 4. Subscription & Dynamic Config Trace

**Scenario A: change `PLAN_CONFIG.starter.priceINR` from 1499 to 1799 and deploy.**

| Surface | Reads `PLAN_CONFIG` live? | Result after deploy |
| --- | --- | --- |
| Landing Starter card (`PricingSection.tsx:39`) | Yes | Shows ₹1,799. |
| Landing Pro card | Not rendered | Pro is invisible on landing regardless. |
| JSON-LD `AggregateOffer` (`layout.tsx:93-94`) | Yes | Updates. |
| Settings plan cards (`billing-settings-client.tsx:290-344`) | Yes | Shows ₹1,799. |
| Current-plan price label (`billing-settings-client.tsx:161`) | Yes | A tenant who paid ₹1,499 now sees "₹1,799 / mo" as their price. Misleading. |
| `POST /api/checkout` order amount (`checkout/route.ts:46`) | Yes | New orders created at ₹1,799. |
| Webhook / verify validation (`billing.ts:71`) | Yes | **Orders created before the deploy but paid after it are rejected** (H2). Money captured, plan not applied. |
| `public/llms.txt:33-35`, `public/llms-full.txt:61-63` | **No, hardcoded** | Still say ₹1,499. AI answer engines quote stale prices. |
| `docs/CHANGELOG.md` | No | Historic; fine. |

**Scenario B: change `PLAN_CONFIG.starter.replyQuota` from 1000 to 1500.**

| Surface | Result |
| --- | --- |
| Landing and Settings cards | Show 1,500. |
| Tenants already on Starter | Keep `subscription.replyQuota: 1000` until their next payment; the quota is snapshotted on the tenant at fulfilment (`billing.ts:93`). This is reasonable grandfathering but nothing tells the customer. |
| Reservation (`reply-worker.ts:133`) | Uses the tenant snapshot, not `PLAN_CONFIG`. Correct. |
| `llms.txt`, `llms-full.txt` | Stale (hardcoded). |

**Scenario C: add a new plan `business`.**

| Surface | Result |
| --- | --- |
| Settings and checkout | Work immediately (`PLAN_KEYS` and `isPlanKey` are derived). |
| Landing | Not shown (two hardcoded keys). |
| `BusinessTenant.subscription.plan` enum (`BusinessTenant.ts:4`) | Not updated. `updateOne` skips validators, so `'business'` is written anyway; any later `document.save()` on that tenant throws a validation error. |

**Scenario D: change the trial.** Quota `300` is hardcoded in `BusinessTenant.ts:33` and `settings/page.tsx:63`; "14-day" is hardcoded in `PricingSection.tsx:81` and `settings/page.tsx:42`; no code enforces a duration (M1).

**Lifecycle on payment (verified correct):** `repliesUsed` is set to 0, `replyQuota` to the plan's quota, `status` to `active`, `currentPeriodEnd` to now + 30 days (`billing.ts:86-97`). Replay of the same order is rejected by the `Payment` primary key. An order paid by another tenant cannot be applied through verify (`verify/route.ts:70-72`) and the webhook trusts only signed `order_tags`, which only the server sets.

**Required changes for a single source of truth:**
1. Move trial settings and per-plan feature bullets into `src/lib/plans.ts`.
2. Derive `SUBSCRIPTION_PLANS` from `PLAN_CONFIG`.
3. Render landing cards by mapping `PLAN_CONFIG`.
4. Validate payments against the pending-order snapshot (H2), never live config.
5. Generate `llms.txt` and `llms-full.txt` from a route handler (`src/app/llms.txt/route.ts`) that imports `PLAN_CONFIG` and `CONTACT`, or add a CI check that fails when they drift.

---

## 5. Remediation Action Checklist

### P0: Must fix before live paying users
- [ ] C1: Agent reply composer + server action; owner notification on every bot pause; "Needs human" filter. Until shipped, empty the default handoff keywords.
- [ ] H1: Clear `__Host-session` with `secure: true`; bump `sessionVersion` on logout.
- [ ] H2 + H3: Pending-order snapshot at checkout; transactional or state-machine fulfilment; alert on rejected paid orders.
- [ ] H4: Remove fabricated stats and unsupported feature claims from landing, FAQ, pricing and demo chat.
- [ ] H5: Rewrite Terms and Privacy (AI processors, DPDP grievance officer, quota expiry); lawyer review.
- [ ] H6: Schedule the sweeper externally every 1 to 2 minutes; add `maxDuration` and a deadline; fan out `after()` per message.
- [ ] M1: Enforce the 14-day trial (or stop advertising it).
- [ ] M2: Return 500 on non-duplicate inbound insert failures.
- [ ] M13: Verify Graph API v21.0 lifecycle and bump the version.
- [ ] Verify the demo number `+91 9400160928` is connected to a FrontLoop demo tenant.

### P1: Current sprint
- [ ] H7: Do not charge quota for fallback replies; tag and alert on AI outages; model IDs in env.
- [ ] M3: Nonce-based CSP without `'unsafe-inline'`.
- [ ] M4: Replace `#0AAF76` for white-text and green-text uses with `#047857`; fix `#25D366` button text.
- [ ] M6: `inert` mobile drawer, Escape, labelled close button.
- [ ] M7: Password reset via Resend; fix per-email lockout.
- [ ] M8: Strict `tenantId` check in `tenantGuard`; `immutable: true`; block `$lookup` without opt-in.
- [ ] M12: `dashboard/loading.tsx`, `global-error.tsx`, no raw error messages.
- [ ] Add error monitoring and an uptime check on the webhook.
- [ ] Expiry reminder banner/email before `currentPeriodEnd`.

### P2: Next sprint
- [ ] M5: `overflow-x-clip` instead of `overflow-x-hidden`; verify sticky header and 360px layout in a browser.
- [ ] M9 + M10: Single plan source of truth; landing maps over all plans including Pro.
- [ ] M11: Same-plan renewals extend from the current period end.
- [ ] L1, L2: Server-formatted dates; date separators in conversations.
- [ ] L4: Handle interactive, button, caption and media messages.
- [ ] L5: Stop returning raw errors from server actions.
- [ ] L10: Server `page.tsx` wrappers with metadata for auth pages; `noindex`.
- [ ] L13: Bound `handoffKeywords` and `languages`.
- [ ] SEO: `FAQPage` and `LocalBusiness` JSON-LD; generate `llms.txt` from config.
- [ ] Meta data-deletion callback (replace the 501 stub) before App Review.

### P3: Backlog polish
- [ ] L6, L7: ARIA for FAQ, tabs, toasts, dialog focus trap; remove or install animation classes.
- [ ] L8, L9: Theme tokens in `@theme`; `next/font` instead of CSS `@import`.
- [ ] L11, L12, L14, L16, L17, L18: sitemap dates, real customer phone, `ipAddress()`, single webhook URL, linked terms, SW cache cap.
- [ ] L15: Staff invites or remove the role.
- [ ] L19: Delete `mvp.md`, `sample.md`, `lint_errors.txt`; real README; sync `product_truth.md`; remove unused env vars and the unused `framer-motion` dependency.
- [ ] Compress `logo.png` (1.2 MB) and `icon-512.png` (226 KB).
- [ ] Plain-language copy for error, 404 and logout dialogs.

---

## 6. Strengths Worth Keeping

1. **Tenant isolation by construction.** `tenantGuard` turns a forgotten `tenantId` into a thrown error instead of a data leak, and the `forTenant()` repository makes the correct pattern the easy one. Cross-tenant jobs opt out explicitly and greppably.
2. **Authoritative sessions.** The JWT is only a hint; role, tenant, `disabled` and `sessionVersion` are re-read from the database and memoised per request with `React.cache`. The proxy is an optimistic gate only.
3. **Fail-closed configuration.** `getEnv()` validates lazily so builds work without secrets, and `requireEnv()` makes every integration throw when its secret is missing. No secret has a fallback default.
4. **Correct cryptography.** AES-256-GCM with random IVs and versioned blobs; every secret comparison is constant-time, including length-safe hashing in `safeEqual`; bcrypt with timing-equalised dummy hashes for unknown emails.
5. **Exactly-once reply economics.** Atomic claim, atomic conditional quota reservation, exactly-once release, and "mark done before bookkeeping" so a crash never double-sends.
6. **Idempotent payments.** `Payment._id = order_id` makes webhook and verify race-safe; order tags are re-validated; verify is bound to the caller's tenant; Cashfree mode is explicit.
7. **Thoughtful AI grounding.** Code-computed business-hours status, delimiter-tagged untrusted input, JSON-mode output with defensive parsing, Unicode-aware handoff matching for Malayalam and Hindi, burst coalescing.
8. **Meta integration hygiene.** Live handshake (token reads number, number belongs to WABA, app subscribed) before storing credentials; one number per tenant enforced by a unique index; tokens in `Authorization` headers, never URLs; merchant-friendly error mapping.
9. **Safe PWA.** The service worker can never serve stale authenticated HTML or API data.
10. **CSV export done right.** Streaming cursor (no memory blowup), formula-injection neutralisation, `no-store`.
11. **Clean toolchain.** Zero TypeScript errors, zero lint warnings, zero production vulnerabilities, and an automated em-dash check that passes.
