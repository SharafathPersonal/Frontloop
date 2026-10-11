# FrontLoop — Full Project Audit Report

**Date:** 2026-10-11 · **Branch:** `main` (includes the uncommitted working tree) · **Auditor:** Claude Code

---

## 1. Executive summary

**Overall: the foundation is solid, but billing has critical holes that need fixing before launch.** Tenant isolation, authentication, WhatsApp ingestion and crypto are well built. Type check, lint and build all pass with zero warnings. The serious risks are concentrated in the **Cashfree payment flow**, an **unscheduled cron**, an **unpatched Next.js release**, and an **uncommitted working tree that would fail to deploy from git**.

| Area | Grade | One-line verdict |
| --- | --- | --- |
| Backend / API security | C+ | Strong auth and webhooks; billing endpoints can be abused for free plans |
| Database & multi-tenancy | B+ | Every tenant query is scoped; guard has latent gaps; quota never resets |
| Frontend & code quality | B− | Clean RSC split; UX dead ends, raw zod errors, hydration mismatches, no loading/error boundaries |
| Design / responsive / a11y | C− | Tailwind v4 cascade bug, brand green fails contrast, zoom disabled, unlinked labels, mobile overflow |
| PWA | D | No manifest, service worker never registered and contains legacy code |
| SEO | C | Good base metadata; missing sitemap, stale `llms.txt` describes old product |
| Build & tooling | B | tsc/lint/build clean; 1 critical + 4 high npm advisories; no tests or CI |
| DevOps / git | D | Required files untracked; cron not scheduled; no security headers |

### Top 10 risks (fix in this order)

| # | Severity | Issue | Where |
| --- | --- | --- | --- |
| 1 | Critical | Cashfree webhook skips signature check when `CASHFREE_SECRET_KEY` is unset → anyone can grant themselves Pro; `tenantId` also accepts Mongo operators | `src/app/api/webhook/cashfree/route.ts:24-30, 61-81` |
| 2 | Critical | Required source files are untracked; a deploy from git fails to build | `src/components/landing/`, `src/lib/plans.ts`, `src/server/business-hours.ts`, `BrandLogo.tsx`, assets |
| 3 | Critical | Next.js 16.2.10 has a critical advisory set (proxy bypass, Server Action DoS, image optimizer SSRF) | `package.json` → upgrade to `next@16.4.0` |
| 4 | High | `/api/checkout/verify` doesn't check that the order belongs to the caller and doesn't dedupe → shared or replayed orders give free or permanent plans | `src/app/api/checkout/verify/route.ts:24-85` |
| 5 | High | `orderId` goes into the Cashfree URL unvalidated and unencoded (credentialed path traversal) | `src/app/api/checkout/verify/route.ts:41-44` |
| 6 | High | `subscription.repliesUsed` never resets; the quota is effectively lifetime, so paying customers go silent | `src/server/reply-worker.ts:120-136` |
| 7 | High | Reply-sweeper cron is never scheduled (no `vercel.json`) | repo root |
| 8 | High | No security headers (CSP, HSTS, frame-ancestors, etc.) | `next.config.ts` |
| 9 | High | Public `llm.txt` / `llms-full.txt` describe the deprecated "True Attendly Broadcast" product | `public/llm.txt`, `public/llms-full.txt` |
| 10 | Medium | Subscription `currentPeriodEnd` is never enforced, so "active" never expires | `src/server/reply-worker.ts:121-125` |

---

## 2. Scope and method

All ~7,300 lines of TypeScript across 75 source files were reviewed, plus configs, scripts, `public/` and docs. Four parallel reviews covered backend/security, database, frontend/design and PWA/build. `tsc`, `eslint`, `next build`, `npm audit` and `npm outdated` were run locally. Critical findings were re-verified by hand.

| Layer | Stack | Location |
| --- | --- | --- |
| Framework | Next.js 16.2 App Router, React 19.2, Tailwind 4 | `src/app/**` |
| Auth | JWT (`jose`), bcryptjs, `src/proxy.ts` optimistic gate + DB-backed DAL | `src/server/auth/*` |
| Database | MongoDB / Mongoose 9.11, `tenantGuard` plugin | `src/server/models/*`, `src/server/db.ts` |
| Messaging | Meta WhatsApp Cloud API | `src/server/meta-graph.ts`, `src/app/api/whatsapp/webhook` |
| AI | Gemini 2.5 Flash / Groq / Cerebras via `after()` + cron sweeper | `src/server/ai-pipeline.ts`, `src/server/reply-worker.ts` |
| Payments | Cashfree checkout / verify / webhook | `src/app/api/checkout/*`, `src/app/api/webhook/cashfree` |
| Validation | zod 4 | routes and actions |
| PWA | `public/sw.js`, `OfflineBanner`, app icons | `public/`, `src/app/` |

**Not covered:** live penetration testing, load testing, Lighthouse on a deployed URL.

### Request flow

```
WhatsApp customer
   │  POST (x-hub-signature-256, HMAC verified, timing-safe)
   ▼
/api/whatsapp/webhook ──► Lead upsert {tenantId, phone} ──► Message insert (dedup on waMessageId)
   │  after()
   ▼
reply-worker: claim pending→processing ─► reserve quota ($expr) ─► LLM (Gemini/Groq/Cerebras)
   │                                                               │
   │                                     sendWhatsAppText (Graph API, 10s timeout)
   ▼
/api/cron/reply-sweeper (Bearer CRON_SECRET) — retries stalled replies  ⚠ never scheduled

Dashboard (browser) ─► proxy.ts (JWT check) ─► requireTenant() DAL (DB check) ─► forTenant() repo
Billing: Settings ─► /api/checkout ─► Cashfree ─► /api/webhook/cashfree + /api/checkout/verify  ⚠
```

---

## 3. Backend & API security

### 3.1 Route & action inventory

| Route / action | Auth | Notes |
| --- | --- | --- |
| `POST /api/auth/login` | Public; same-origin, zod, rate limit 5/15 min per IP+email | Dummy-hash timing protection |
| `POST /api/auth/register` | Public; same-origin, zod, rate limit 5/h per IP | Creates user + tenant + KB |
| `POST /api/auth/logout` | Same-origin | Only clears the cookie |
| `POST /api/auth/forgot-password` | Same-origin, rate limit | **Stub, 501** |
| `POST /api/auth/reset-password` | None | **Stub, 501** |
| `GET/POST /api/auth/callback/facebook` | None | **Stub, 501** |
| `POST /api/checkout` | `requireTenantApi(['owner'])` | No same-origin, no zod; **no UI calls it** |
| `POST /api/checkout/verify` | `requireTenantApi(['owner'])` | No same-origin, no zod; see H1/H2 |
| `POST /api/webhook/cashfree` | HMAC **only if secret set** | See C1 |
| `GET/POST /api/whatsapp/webhook` | Verify token / HMAC, timing-safe, fail-closed | Correct |
| `/api/webhook/whatsapp` | Re-export of the above | Duplicate public path |
| `GET /api/cron/reply-sweeper` | Bearer `CRON_SECRET`, timing-safe | Correct, uses `crossTenant` |
| `GET /api/leads/export` | `requireTenantApi(['owner','staff'])` | Tenant-scoped, CSV injection escaped |
| Leads actions (toggle bot, status, notes) | `requireTenant`, zod | Correct |
| Knowledge actions (save, simulate) | `requireTenant`, zod / rate limit | Correct |

### 3.2 Findings

#### CRITICAL

**C1. Cashfree webhook fails open.** `src/app/api/webhook/cashfree/route.ts:24-30`, `src/server/env.ts:30`
- Signature verification is wrapped in `if (secretKey) {…}`, and `CASHFREE_SECRET_KEY` is optional. With billing unconfigured, any POST is processed. This violates AGENTS.md §3 (fail closed).
- `order_tags.tenantId` (line 71) is used in `BusinessTenant.updateOne({ _id: tenantId })` without a type check, so `{"$ne": null}` upgrades an arbitrary tenant.
- **Exploit:** `curl -X POST /api/webhook/cashfree -d '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_tags":{"tenantId":"<id>","plan":"pro"}}}}'` grants Pro (10,000 replies) for free, repeatably.
- **Fix:** `requireEnv('CASHFREE_SECRET_KEY')` (or 503 if missing); validate the body with zod; require `tenantId` to match `/^[a-f0-9]{24}$/` and cast it to `ObjectId`.

#### HIGH

**H1. Checkout verify isn't bound to the tenant and orders can be replayed.** `src/app/api/checkout/verify/route.ts:24-85`
- Any owner can submit any PAID `orderId`, and their own tenant gets upgraded. `order_tags.tenantId` is never compared with the session.
- Nothing records consumed orders, so one payment can be re-verified every 30 days for a permanent plan.
- Order IDs are guessable: `SUB_<last6 of tenantId>_<Date.now()>` (`checkout/route.ts:48`).
- Unknown plan tags default to `'starter'` (line 67), so any PAID order on the merchant account grants Starter.
- **Fix:** require `order_tags.tenantId === session.tenantId`; check `order_amount`/currency against `PLAN_CONFIG`; reject unknown plans; add a `Payment` model with a unique `orderId` (insert first, treat E11000 as already applied); generate IDs with `randomBytes`.

**H2. Unvalidated `orderId` in the upstream URL.** `src/app/api/checkout/verify/route.ts:41-44`
- `https://api.cashfree.com/pg/orders/${orderId}`, with no validation and no `encodeURIComponent`. Allows path traversal on a request carrying the merchant secret; the upstream `message` is echoed back (line 60).
- **Fix:** zod `/^[A-Za-z0-9_-]{1,50}$/` + `encodeURIComponent`.

#### MEDIUM

**M1. Webhook has no replay window, idempotency or amount check.** `cashfree/route.ts:57-83` — `x-webhook-timestamp` freshness is never checked, `cf_payment_id` is never deduped, and `order_amount` is never compared. **Fix:** reject timestamps older than 5 min, upsert `ProcessedPayment{_id: cf_payment_id}`, verify the amount.

**M2. Subscription lifecycle gaps.** `currentPeriodEnd` is written but never enforced; `repliesUsed` is never reset on payment (a trial user at 300/300 who buys Starter gets 700, not 1,000). **Fix:** add `currentPeriodEnd: {$gt: now}` to the quota reservation and reset `repliesUsed: 0` on activation.

**M3. Reply worker leaks quota and can send duplicates on crash.** `src/server/reply-worker.ts:119-239`
- No try/finally after the quota reservation. A thrown error leaves the message `processing` with quota consumed; the sweeper retries every 2 min and reserves again each time.
- A crash between `sendWhatsAppText` (line 179) and the `done` update (lines 211-214) sends a duplicate reply.
- The sweeper processes up to 50 LLM calls serially with no `maxDuration`.
- **Fix:** try/catch → `releaseQuota()` + `finish('failed')`; attempt counter with a max; record a "sending" state with the outbound wamid; bound the sweeper by wall time.

**M4. Cron never scheduled.** No `vercel.json`. `docs/product_truth.md` claims a self-healing sweeper that never runs. **Fix:** see §8.

**M5. Prompt injection from WhatsApp customers.** `src/server/ai-pipeline.ts:84-94`, `reply-worker.ts:231-234`
- History is flattened into one user-prompt string (`Customer: …` / `Bot: …`), so a customer can forge `Bot:` / `System:` lines.
- Model JSON is written directly onto the Lead (`requirement`, `intent`, `name`, `botPaused`).
- Risks: fake prices or promises, extraction of KB/persona, poisoned dashboard and CSV fields, forced handoff.
- **Fix:** real multi-turn `user`/`assistant` messages; delimit untrusted text; tell owners KB content is effectively public; optionally check quoted prices against the KB.

**M6. Login rate limit is keyed per IP+email.** `src/app/api/auth/login/route.ts:26` — unlimited credential stuffing across accounts from one IP. **Fix:** add per-IP (30/15 min) and per-email (10/h) buckets.

#### LOW

| ID | Issue | Location | Fix |
| --- | --- | --- | --- |
| L1 | Logout doesn't revoke the JWT (valid 7 days) | `api/auth/logout/route.ts:9` | `$inc sessionVersion` on logout |
| L2 | Registration enumerates emails (409); no email verification | `api/auth/register/route.ts:39,57` | Verification + generic response |
| L3 | Checkout routes lack `isSameOrigin` and zod | `checkout/route.ts:12`, `verify/route.ts:11` | Add both |
| L4 | Upstream / Mongo error messages leak to the client | `checkout/*:59-99`, `leads/actions.ts:32`, `knowledge/actions.ts:71,129` | Log server-side, return generic message / 502 |
| L5 | Rate limit trusts first `x-forwarded-for` | `src/server/http.ts:11` | `ipAddress(req)` from `@vercel/functions` |
| L6 | Unbounded `handoffKeywords` / `languages` (regex compiled per message) | `repos/tenant.ts:51-60,131-140` | `.max()` limits |
| L7 | Production `console.log`; customer phone sent to LLMs | `cashfree/route.ts:82`, `ai-pipeline.ts:91` | Remove both |
| L8 | Tenant cache (60 s) and no `tenant.id === tenantId` check in worker | `tenant-resolver.ts:18-28`, `reply-worker.ts:56` | Assert match; invalidate on settings change |
| L9 | Fake billing contact sent to Cashfree (`9999999999`) | `checkout/route.ts:64-65` | Collect real details |
| L10 | bcrypt silently truncates passwords > 72 bytes (max is 200) | `auth/password.ts` | Cap at 72 bytes |

**Info:** password reset is a stub. The TODO design (sha256 token, expiry, `sessionVersion` bump) is correct; also add single-use and a generic response.

---

## 4. Database & multi-tenancy

**Verdict:** every query on `Lead`, `Message` and `KnowledgeBase` includes `tenantId` (ID lookups use `findOne({_id, tenantId})`), and the only `crossTenant` opt-outs are the three sweeper queries. Connection handling suits serverless. The risks are latent gaps in the guard plugin and billing state.

### 4.1 Models

| Model | Key fields | Indexes | Guarded |
| --- | --- | --- | --- |
| BusinessTenant | slug, category, ownerId, timezone, botEnabled, `whatsapp{phoneNumberId, accessTokenEnc (select:false, AES-GCM), status}`, `subscription{plan, status, currentPeriodEnd, replyQuota, repliesUsed}` | slug unique; phoneNumberId unique partial; ownerId; `{subscription.status, currentPeriodEnd}` (unused) | Root model |
| User | email, passwordHash (select:false), role, tenantId, sessionVersion, disabled | email unique; `{tenantId, role}` | No (lookups by id/email) |
| KnowledgeBase | faqs, services (priceMinor in paise), hours, context (≤8k), bot{persona, languages, handoffKeywords}, version; 60k size check | `{tenantId}` unique | Yes |
| Lead | phone (regex), name, requirement, intent, status, botPaused, timestamps, notes | `{tenantId, phone}` unique; `{tenantId, status, lastMessageAt, _id}`; `{tenantId, lastMessageAt, _id}`; `{tenantId, createdAt}` | Yes |
| Message | leadId, direction, author, status, replyState, waMessageId, body (≤4096), claimedAt | waMessageId unique partial; `{tenantId, leadId, createdAt}`; `{replyState, createdAt}` partial | Yes |
| RateLimit | _id key, count, expiresAt | TTL on expiresAt | N/A |

### 4.2 `tenantGuard` coverage

| Operation | Covered |
| --- | --- |
| find, findOne, findOneAnd*, update*, replaceOne, delete*, countDocuments, distinct | Yes |
| findById, exists | Yes (via findOne) |
| insertMany, bulkWrite | Yes |
| aggregate | Partly (first `$match` only) |
| estimatedDocumentCount | **No** |
| `doc.save()` on existing doc | **No** |
| `Model.collection.*` raw driver | **No** |
| Update that sets `tenantId` to another tenant | **No** |

### 4.3 Findings

| Sev | Issue | Location | Fix |
| --- | --- | --- | --- |
| Medium | Guard checks `tenantId != null` only, so `{$ne:null}`, `{$exists:true}` and `{$in:[…]}` pass | `models/plugins/tenant-guard.ts:20,33` | Require `ObjectId` or `{$eq: ObjectId}` |
| Medium | Aggregate guard ignores `$lookup` / `$unionWith` / `$graphLookup` | `tenant-guard.ts:39-45` | Walk the pipeline; reject unless crossTenant |
| Medium | `tenantId` is mutable | Lead, Message, KnowledgeBase schemas | `immutable: true` |
| Medium | Worker overwrites `status` with a value read before a 10–40 s LLM call, undoing agent changes | `reply-worker.ts:228-239` | Conditional `updateOne({status:'new'}, {$set:{status:'contacted'}})` |
| Medium | `syncIndexes()` drops non-schema indexes by default, including manual Atlas ones | `scripts/sync-indexes.ts:20` | Default to dry-run; require `--apply` |
| Medium | Subscription expiry never enforced; index unused | `reply-worker.ts:121-125` | Filter on `currentPeriodEnd` or a billing cron |
| Low | Delivery status read-then-write race (`delivered` can overwrite `read`) | `whatsapp/webhook/route.ts:143-168` | Single conditional update |
| Low | Lead upsert skips validators (phone regex) | `whatsapp/webhook/route.ts:196-208` | `runValidators: true` |
| Low | `parseInt(timestamp)` → NaN → Invalid Date → webhook 500 or a lost message | `whatsapp/webhook/route.ts` | Validate the timestamp |
| Low | Registration isn't transactional; slug E11000 reported as "email exists" | `api/auth/register/route.ts:39-59` | `session.withTransaction()` |
| Low | KB edits are last-write-wins (`version` unused) | `repos/tenant.ts:157-165` | Optimistic concurrency on `version` |
| Low | Sweeper does N+1 tenant lookups | `reply-sweeper/route.ts:74` | Batch-load tenants |
| Low | `?search=a&search=b` throws → 500 | `dashboard/leads/page.tsx:26`, `repos/tenant.ts:80` | Normalize array params |
| Low | `saveKnowledgeBaseAction` returns the full document | `knowledge/actions.ts:15-18` | Return `{ ok: true }` |
| Info | `strictQuery: true` silently drops unknown filter keys | `db.ts:12` | Consider `'throw'` |
| Info | No TTL / retention on Message | `models/Message.ts` | Define a retention policy |
| Info | Token encryption has no AAD and no key rotation | `server/crypto.ts` | Bind to tenantId; plan rotation (`v1` prefix ready) |

### 4.4 Strengths
- Unique `{tenantId, phone}` lead key, `$max` monotonic timestamps, inbound dedup on `waMessageId` with E11000 handling.
- Atomic quota reservation with `$expr` and an atomic pending→processing claim.
- Cursor pagination on matching compound indexes, capped at 100. CSV export streams via a cursor.
- Anchored, digit-only phone search regex; escaped handoff keywords.
- Serverless-safe connection caching, `bufferCommands: false`, `autoIndex` off in production.
- ObjectId and Date serialized to strings before reaching client components.

---

## 5. Frontend & code quality

**Verdict:** the server/client split is clean: data pages are async server components that pass serialized props to small client islands, and client files only `import type` from `@/server/*`. The weak spots are UX dead ends, raw error messages shown to users, hydration mismatches, and no loading or error boundaries in the dashboard.

### 5.1 Findings

| Sev | Issue | Location | Fix |
| --- | --- | --- | --- |
| High | Saving the KB with an empty FAQ/service shows raw zod JSON (`Error: [{"origin":…}]`); no client-side validation, so one blank row blocks every save | `dashboard/knowledge/actions.ts:19`, `server/repos/tenant.ts:129`, `knowledge-client.tsx:141,156` | `safeParse` → return `issues[0].message` + path; drop blank rows or highlight them |
| High | Dead ends: "Connect WhatsApp" banner → Settings has no connect flow (`/api/auth/callback/facebook` = 501); upgrade cards have no button; "Forgot password?" leads to 501 APIs | `dashboard-shell.tsx:190`, `settings/page.tsx:98-113`, `auth/login/page.tsx:86` | Build checkout + Embedded Signup, or hide them / show "coming soon" |
| High | Legal pages describe the old product ("uploaded spreadsheets… PostgreSQL", broadcast, prepaid credits, `is_blocked`). Meta app review needs an accurate privacy policy | `privacy/page.tsx:16`, `terms/page.tsx:16,23,30` | Rewrite for FrontLoop (WhatsApp data, MongoDB, LLM processors) |
| High | Hydration mismatches: locale/timezone date and number formatting during SSR (server UTC/en-US vs browser IST/en-IN) | `leads-table-client.tsx:296`, `lead-conversation-client.tsx:190,254`, `PricingSection.tsx:68,132` | Format with fixed `timeZone` (tenant timezone) + `en-IN`, or after mount |
| High | Demo WhatsApp number is a placeholder (`919876543210`) on the main CTA | `src/app/page.tsx:20`, `GlobalFooter.tsx:98` | Real demo number from config |
| Medium | Bot toggle and notes save fail silently; `ToastProvider` is mounted but nothing calls `useToast` | `leads-table-client.tsx:94-107`, `lead-conversation-client.tsx:61-87`, `dashboard-shell.tsx:131` | Show error toasts |
| Medium | No `loading.tsx` anywhere; filter clicks have no pending state | `src/app/dashboard/*`, `leads-table-client.tsx:81` | `dashboard/loading.tsx` skeletons; `useTransition` |
| Medium | Only a root `error.tsx`: a dashboard error replaces the whole shell and prints `error.message`; no `global-error.tsx` | `src/app/error.tsx:35` | Add `dashboard/error.tsx`, `global-error.tsx`; show the digest |
| Medium | KB Save button only at the top of a long page; no unsaved-changes guard | `knowledge-client.tsx:248` | Sticky save bar + `beforeunload` |
| Medium | Price/duration: `parseFloat('')` → 0, can't be cleared; no `min=0` | `knowledge-client.tsx:474,486` | Map empty to `undefined`; `min={0}` |
| Medium | Conversation opens scrolled to the oldest message; no reply composer during human takeover (landing page says staff can "chat directly") | `lead-conversation-client.tsx:146-200` | Auto-scroll to bottom; track the composer as a product gap |
| Medium | Annual billing "−20%" toggle has no backend; prices hard-coded rather than read from `PLAN_CONFIG`; Pro plan missing | `PricingSection.tsx:10,28-50` | Render from `PLAN_CONFIG`; remove the toggle |
| Low | Raw `err.message` returned to the client | `leads/actions.ts:32`, `knowledge/actions.ts:77` | Generic message, log server-side |
| Low | Constants duplicated from the server (`CATEGORIES`, statuses) | `register/page.tsx:10`, `lead-conversation-client.tsx:219-222`, `leads-table-client.tsx:168` | Move to `src/lib` (mongoose-free) |
| Low | Server-side `toLocaleDateString(undefined)` uses UTC; dates can be off by a day | `dashboard/page.tsx:180`, `settings/page.tsx:88` | Pass the tenant timezone |
| Low | Tenant fetched twice per request (layout + page) | `dashboard/layout.tsx:17` | React `cache()` |
| Low | Hard-coded personal phone and name on the support page; TODO | `support/page.tsx:4,25,32` | Move to config |
| Low | Signed-in users visiting `/auth/login` aren't redirected | `src/proxy.ts:31` | Optional redirect |
| Low | `OfflineBanner` reads `navigator.onLine` in the `useState` initializer (hydration mismatch) | `components/ui/OfflineBanner.tsx:6` | Init `true`, update in effect |
| Low | Dead legacy CSS (Lenis, `.gsap-reveal`, `.dropzone`, `.status-insufficient_credits`…); Lexend Exa downloaded but unused | `globals.css:1,61-80,138,161-226` | Delete |
| Low | Unused `framer-motion`; Cashfree SDK only in a type stub | `package.json` | Remove or wire up |
| Info | Leftover / odd copy: "Dispatch queues are safely paused", "PROCESSING PROFILE...", "ROUTE UNCHARTED"; marketing copy shows the internal field `botPaused`; footer shows a fabricated "99.98% uptime" | `OfflineBanner.tsx:30`, `not-found.tsx:8`, `page.tsx:298`, `FaqSection.tsx:25`, `GlobalFooter.tsx:19-29` | Rewrite; remove the fake status |

### 5.2 Strengths
- Clean RSC architecture; `server-only` on server modules; no server code leaks into the client.
- Every dashboard query goes through `forTenant(session.tenantId)`; actions re-check the session and validate input with zod.
- `key` remounting on filter change, optimistic status update with rollback, cursor pagination.
- `BrandLogo` uses `next/image` with `sizes` and `priority`; quota bar has `role="progressbar"`.
- No `console.log` in app code; no code references to deleted public assets; no Supabase / Prisma / dead-stock code left in `src/` (only in legal copy, `sw.js`, `llm*.txt` and `User.legacySupabaseId`).

---

## 6. Design, UX & responsiveness

### 6.1 Design consistency

| Sev | Issue | Location | Fix |
| --- | --- | --- | --- |
| Medium | **Tailwind v4 cascade bug:** custom classes aren't in an `@layer`, so they beat utilities. `.serif-headline` cancels `font-bold` on the hero h1; `.btn-primary` ignores `py-*` / `text-*` overrides | `globals.css:40,101-136`; `page.tsx:76`, `error.tsx:39`, `forgot-password:73` | Wrap in `@layer components` |
| Medium | `font-sans` resolves to the system stack, not Inter. The landing page renders in the system font while Inter is still downloaded (render-blocking `@import`) | `globals.css:1`; `page.tsx:26` etc. | `@theme { --font-sans: … }` + `next/font/google` |
| Medium | Design tokens mostly unused; hex values hard-coded 600+ times (`#0F172A` ×165, `#64748B` ×158); duplicate accent tokens | all components | Move to `@theme` tokens (`bg-brand`, `text-muted`) |
| Low | Three different button styles; radii from `sm` to `3xl`; errors mix `red-*` and `rose-*` | components | Standardize a button and radius scale |
| Low | Dashboard status badges all emerald, while the leads table uses a colour map | `dashboard/page.tsx:167` | Share `STATUS_COLORS` |
| Low | KB error banner uses a `CheckCircle` icon and is detected with `startsWith('Error')` | `knowledge-client.tsx:266` | Typed `{kind, msg}` + alert icon |
| Low | `animate-in`, `fade-in`, `zoom-in-95` need `tw-animate-css` (not installed), so they do nothing; `no-scrollbar` is undefined | `CustomConfirm.tsx:47`, `ToastContext.tsx:46`, `IndustryVerticalsSection.tsx:136` | Install the plugin or remove the classes |
| Low | Off-brand amber link with a stray `dark:` variant (≈2:1 contrast in OS dark mode); no dark mode elsewhere | `auth/login/page.tsx:86` | Remove |
| Low | Emoji in a button label | `reset-password/page.tsx:119` | Lucide icon |

### 6.2 Responsiveness

| Sev | Issue | Location | Fix |
| --- | --- | --- | --- |
| Medium | Mobile header needs ~400px; at 360–375px the CTA wraps or overflows and `body overflow-x-hidden` hides it | `page.tsx:28-66`, `layout.tsx:15` | Hide "Sign In" or shorten the CTA below `sm` |
| Medium | Toasts: `fixed right-5 w-full max-w-sm` clips 20px off-screen on phones | `ToastContext.tsx:42` | `inset-x-4 sm:left-auto sm:right-5` |
| Medium | 8-column leads table scrolls horizontally on mobile; rows are click-only | `leads-table-client.tsx:191-322` | Card list below `md` |
| Medium | `h-screen` breaks under the iOS Safari URL bar | `dashboard-shell.tsx:132,135` | `h-dvh` |
| Low | Fixed `h-[650px]` chat panel on mobile | `lead-conversation-client.tsx:126` | `h-[60dvh] lg:h-[650px]` |
| Low | Touch targets under 44px: hours trash (~17px), FAQ trash (~23px), bot toggle (~24px), filter pills (~28px), toast close (14px), confirm X (16px), hamburger (~32px) | `knowledge-client.tsx:557,652`, `leads-table-client.tsx:273`, etc. | ≥ 40–44px hit areas |
| Low | 12px dashboard inputs only avoid iOS auto-zoom because zoom is disabled | dashboard inputs | `text-base sm:text-xs`, then re-enable zoom |
| Low | Hero jumps from `text-3xl` to `sm:text-6xl` | `page.tsx:76` | Intermediate step |

### 6.3 Accessibility

| Sev | Issue | Location | Fix |
| --- | --- | --- | --- |
| High | **Pinch-zoom disabled** (`maximumScale: 1, userScalable: false`), fails WCAG 1.4.4 | `src/app/layout.tsx:7-8` | Remove both |
| High | Labels not linked to inputs (no `htmlFor`/`id`) on every auth form, KB fields, lead notes/status, leads search, confirm input; several placeholder-only fields | `login:66,83`, `register:97-169`, `knowledge-client.tsx:306-565`, `lead-conversation-client.tsx:213,266`, `leads-table-client.tsx:150`, `CustomConfirm.tsx:91` | `htmlFor`/`id` or `aria-label` |
| High | **Brand green fails contrast:** white on `#0AAF76` = 2.84:1 (all primary buttons, green links); white on `#25D366` ≈ 2:1 | global | emerald-700 `#047857` or darker for text and button backgrounds |
| Medium | `CustomConfirm` modal: no Escape, no focus trap, no initial focus or focus return, no `aria-labelledby` | `CustomConfirm.tsx:45-121` | Native `<dialog>` + `showModal()` |
| Medium | Closed mobile sidebar stays in the tab order; close button unlabeled; no Esc; no `aria-current` | `dashboard-shell.tsx:88,140-154` | `inert`, `aria-label`, Esc handler, `aria-current="page"` |
| Medium | Errors and status messages not announced | auth error boxes, KB save/sim messages, toasts | `role="alert"` / `aria-live` |
| Medium | No `focus-visible` styles; `outline: none` everywhere | `globals.css:94` + components | `focus-visible:ring-2` |
| Medium | Accordion / tabs / toggles lack `aria-expanded`, `role=tab`, `aria-selected`, `aria-pressed` | `FaqSection.tsx:76`, `IndustryVerticalsSection.tsx:141`, `PricingSection.tsx:28-50`, `leads-table-client.tsx:169` | Add ARIA states |
| Low | No `<main>` landmark on landing/legal pages; heading skips (h1 → h3) | `page.tsx`, `privacy`, `terms`, `forgot-password:70` | Fix the semantics |
| Low | Spinner has no `role="status"`; no `prefers-reduced-motion` guard | `Spinner.tsx:3`, `globals.css:25`, footer ping | Add both |
| Low | Auth, privacy, terms and support pages have no own metadata (inherit the landing title) | `auth/layout.tsx`, `privacy`, `terms`, `support` | `metadata` exports |

---

## 7. PWA, SEO & performance

### 7.1 PWA — not installable

| Check | Status |
| --- | --- |
| Web app manifest | **Missing** (no `app/manifest.ts` or `manifest.json`) |
| Service worker registered | **No** (no `navigator.serviceWorker.register` anywhere) |
| `public/sw.js` content | Push-only legacy: no fetch/cache, no versioning, no `skipWaiting`/`clients.claim`, no offline fallback; builds `/offers/...` links (deprecated flash offers, lines 35-37); `notificationclick` opens any URL from the payload (open redirect, line 42); many `console.log` |
| Icons | `icon.png` 512×512, `apple-icon.png` 180×180, `favicon.ico` 16/32. **No 192 or maskable icon** |
| Theme colour / viewport | No `themeColor` |
| Offline UX | `OfflineBanner` exists (hydration bug, §5) |

**Fix (if a PWA is wanted):** add `src/app/manifest.ts` (`name`, `short_name`, `start_url: '/dashboard'`, `display: 'standalone'`, `theme_color: '#0F172A'`, 192/512/maskable icons); rewrite `sw.js` as a versioned worker that **never caches `/api` or `/dashboard`**, serves an offline fallback page, and validates notification URLs as same-origin; register it from a small client component. Otherwise delete `sw.js`.

### 7.2 SEO

| Check | Status |
| --- | --- |
| `metadataBase` | Set (`https://frontloop.online`) |
| OG image | Exists, 1200×630 |
| Sitemap | **Missing**; `public/robots.txt:6` points to a non-existent `/sitemap.xml` |
| Per-page metadata | Missing on `/privacy`, `/terms`, auth pages (client components; add a `layout.tsx` per route) |
| Canonical | Missing `alternates.canonical` |
| robots | Disallows `/dashboard/`; consider also `/auth/` |
| `public/llm.txt`, `llms-full.txt` | **Describe the deprecated "True Attendly Broadcast" product (41 hits)**. Rewrite or delete |
| Legacy image domains | `next.config.ts` `remotePatterns` allows `trueattendly.online` domains; nothing uses remote images. Remove |

### 7.3 Performance
- Build: 24 static pages, compiled in 7.5 s. Static: `/`, `/auth/*`, `/privacy`, `/terms`. Dynamic: `/api/*`, `/dashboard/*`.
- Client JS: 968 KB total in `.next/static/chunks` (largest 227 / 118 / 113 KB, not gzipped).
- `public/images/logo.png` is 1.2 MB and unreferenced. Remove it or compress it.
- Removing `framer-motion` and switching to `next/font` cuts payload and render-blocking.

---

## 8. Build, tooling & DevOps

### 8.1 Results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass, 0 errors |
| `npm run lint` | Pass, 0 problems |
| `npm run build` | Pass (with `.env.local`) |
| `npm audit --omit=dev` | **6 vulns: 1 critical, 4 high, 1 moderate** (next, postcss, sharp, nanoid, source-map-js, baseline-browser-mapping); 14 including dev |
| Secrets scan (tracked + untracked + history) | Clean |
| Forbidden deps (axios, got, express, prisma, supabase) | None |
| Unused deps | `framer-motion`, `@cashfreepayments/cashfree-js` |
| Tests / CI | **None** |

### 8.2 Findings

| Sev | Issue | Fix |
| --- | --- | --- |
| Critical | Untracked files the build needs: `src/components/landing/`, `src/components/ui/BrandLogo.tsx`, `src/lib/plans.ts`, `src/server/business-hours.ts`, `scripts/lib/`, `scripts/seed-tenant.ts`, `scripts/test-webhook-flow.ts`, `public/images/{logo,logo-mark,og-image}.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`, `.env.local.example` | Review, `git add -A`, verify from a clean clone |
| Critical | Next.js 16.2.10 advisories | `next@16.4.0` + `eslint-config-next@16.4.0`, then `npm audit fix` |
| High | Cron not scheduled | Add `vercel.json`: `{"crons":[{"path":"/api/cron/reply-sweeper","schedule":"*/5 * * * *"}]}` and set `CRON_SECRET`. Vercel Hobby allows daily crons only, so use Pro or an external scheduler |
| High | No security headers; `poweredByHeader` on | `headers()` in `next.config.ts`: CSP, HSTS, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader: false` |
| Medium | Cashfree sandbox/prod keyed on `NODE_ENV`; Vercel previews hit live Cashfree | `checkout/route.ts:52-55`, `verify/route.ts:43-44` → explicit `CASHFREE_ENV` |
| Medium | No tests, no CI | GitHub Actions: tsc + lint + build; unit tests for tenantGuard, crypto/signatures, plan/quota logic |
| Medium | Docs drift: `product_truth.md` says Gemini 1.5 Flash (code uses `gemini-2.5-flash`, `ai-pipeline.ts:5`); CHANGELOG mentions non-existent `/public/logo.png` and the old brand; README is create-next-app boilerplate | Sync docs |
| Medium | `.gitignore` ignores bare `CHANGELOG.md` and `product_truth.md` at any path | Remove those lines |
| Low | `.env.local.example` missing `CASHFREE_API_VERSION`, `NEXT_PUBLIC_APP_VERSION`, script vars | Add them |
| Low | Root clutter: `mvp.md`, `sample.md`, stale `lint_errors.txt`, `/service/` gitignore entry | Clean up |
| Low | Two WhatsApp webhook URLs | Keep one; document the one Meta should use |

### 8.3 Environment (fail-closed, verified)
- Required: `MONGODB_URI`, `AUTH_SECRET` (≥32), `TOKEN_ENC_KEY` (32-byte base64), `MONGODB_DB` (default `frontloop`).
- Enforced on use via `requireEnv`: `META_APP_SECRET`, `META_VERIFY_TOKEN` (≥24), `CRON_SECRET` (≥24), LLM keys, Cashfree keys. **Exception: Cashfree webhook (C1).**
- Defaults only for non-secrets (`GRAPH_API_VERSION`, `CASHFREE_API_VERSION`).

### 8.4 Git working tree
69 tracked files modified or deleted (+1,327 / −1,856), 4 staged deletions, 13 untracked paths, all on `main`, mixing security fixes, billing, UI rebrand and dependency removal. AGENTS.md §6 asks for discrete commits. Suggested split: `chore(deps)` → `fix(security)` → `feat(reply-worker/quota)` → `feat(knowledge/leads)` → `feat(brand)` + assets → `docs`. Nothing is backed up until committed.

---

## 9. Prioritized remediation plan

### P0 — before any production traffic
- [ ] Commit the working tree in logical commits; verify the build from a clean clone (§8.4)
- [ ] Make the Cashfree webhook fail closed and validate `tenantId` with zod/ObjectId (C1)
- [ ] Upgrade `next` to 16.4.0 and run `npm audit fix`
- [ ] Bind `/api/checkout/verify` to the session tenant, check amount, add `Payment` idempotency, validate/encode `orderId` (H1, H2)

### P1 — this sprint
- [ ] Reset `repliesUsed` on activation; enforce `currentPeriodEnd` (H / M2, DB M6)
- [ ] Webhook replay window + `cf_payment_id` dedup + amount check (M1)
- [ ] Add `vercel.json` cron and set `CRON_SECRET` (M4)
- [ ] Security headers + `poweredByHeader: false`; remove legacy `remotePatterns`
- [ ] Crash-safe reply worker: try/finally quota release, attempt cap, "sending" state (M3)
- [ ] Rewrite or delete `public/llm.txt` and `llms-full.txt`
- [ ] Remove `userScalable: false` / `maximumScale: 1`
- [ ] Explicit `CASHFREE_ENV`
- [ ] Build the billing UI (Settings → Cashfree checkout) or hide pricing CTAs
- [ ] Rewrite privacy and terms pages for FrontLoop (needed for Meta app review)
- [ ] Replace the placeholder demo WhatsApp number
- [ ] Fix the KB save validation UX (no raw zod JSON; handle blank rows)
- [ ] Fix hydration mismatches (fixed timezone/locale formatting)
- [ ] Hide dead ends (Connect WhatsApp, Forgot password) until the flows exist

### P2 — next sprint
- [ ] Prompt-injection hardening: multi-turn roles, delimit untrusted text, drop phone from prompt (M5, L7)
- [ ] Login rate limits per IP and per email (M6)
- [ ] tenantGuard: type-check `tenantId`, `immutable: true`, cover `estimatedDocumentCount` and aggregate sub-pipelines
- [ ] Worker: conditional status update (DB M4); `tenant.id === tenantId` assertion
- [ ] `sync-indexes` dry-run by default
- [ ] PWA: manifest + proper service worker, or delete `sw.js`
- [ ] `sitemap.ts`, per-page metadata, canonical
- [ ] CI pipeline + unit tests for guard, crypto, quota
- [ ] Implement password reset (hashed token, TTL, single-use, generic response)
- [ ] Accessibility pass: darker brand green, linked labels, `<dialog>` modal, `inert` sidebar, focus-visible rings, `aria-live`
- [ ] Tailwind: wrap custom CSS in `@layer components`; `@theme` tokens incl. `--font-sans`
- [ ] Mobile: leads card list, `h-dvh`, toast positioning, header at 360px, 44px touch targets
- [ ] `dashboard/loading.tsx`, `dashboard/error.tsx`, `global-error.tsx`; error toasts for silent failures

### P3 — backlog
- [ ] Logout revokes the session (`sessionVersion`); email verification at signup
- [ ] Registration in a transaction; KB optimistic concurrency
- [ ] `next/font`; remove `framer-motion`, the unused Cashfree SDK, and the 1.2 MB `logo.png`
- [ ] Fix the `OfflineBanner` hydration bug
- [ ] Delete dead legacy CSS; standardize buttons, radii and colours; render pricing from `PLAN_CONFIG`
- [ ] Remove the fabricated "99.98% uptime" footer status and internal `botPaused` wording
- [ ] Message retention policy; encryption AAD and key rotation
- [ ] Docs sync (README, product_truth, CHANGELOG); `.gitignore` cleanup

---

## 10. Strengths worth keeping

- **Auth:** HS256 JWT with issuer/audience/expiry pinned; `__Host-` httpOnly secure SameSite=Lax cookie; proxy is an optimistic gate only, and the DAL re-checks role, tenant, `disabled` and `sessionVersion` from the DB; login redirect is restricted to `/dashboard…` (no open redirect).
- **Login hygiene:** bcrypt cost 12, dummy-hash for unknown users, a generic error, rate limit before the DB lookup.
- **Crypto:** `timingSafeEqual` for Meta HMAC, Cashfree HMAC, verify token and cron secret; AES-256-GCM token encryption with random IV and `select: false`.
- **Tenancy:** every tenant query is scoped; `forTenant` repo pattern; explicit `crossTenant` only in the sweeper.
- **WhatsApp ingestion:** raw-body HMAC, dedup index, monotonic delivery status, `$max` timestamps.
- **Reply worker:** atomic claim and quota reservation, per-lead/per-tenant rate limits, 24 h service-window check, burst coalescing.
- **Conventions:** native `fetch` with `AbortSignal.timeout`, `after()` background work, no forbidden deps, fail-closed zod env validation, zero TypeScript or lint warnings, no committed secrets, CSV formula-injection escaping.
