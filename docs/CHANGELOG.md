# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security - Audit Remediation (P0/P1, see `audit.md`)
- **Cashfree webhook fails closed** (`src/app/api/webhook/cashfree/route.ts`): returns 503 when billing env is missing and 401 on a bad signature; signature verification is never skipped. Rejects webhooks whose `x-webhook-timestamp` is more than 5 minutes off (replay window). The payload is zod-validated, `order_tags.tenantId` must be a 24-char hex ObjectId and the plan a known `PLAN_CONFIG` key. Non-success event types are acknowledged and ignored.
- **Idempotent, amount-checked fulfilment** (`src/server/billing.ts`, new `Payment` model): the webhook and `/api/checkout/verify` share one path. A `Payment` row keyed by the Cashfree `order_id` is inserted first, so a duplicate delivery or replayed verify hits E11000 and grants nothing. `order_amount` and currency must equal the plan's `PLAN_CONFIG` price in INR. Activation resets `subscription.repliesUsed` to 0 and sets a fresh 30-day `currentPeriodEnd`.
- **Checkout verify bound to the caller** (`src/app/api/checkout/verify/route.ts`): the order's `order_tags.tenantId` must equal the session tenant. Orders paid for another tenant return 404, and replayed orders return 409. `orderId` is validated against `/^[A-Za-z0-9_-]{1,50}$/` and `encodeURIComponent`-encoded before the upstream call. Added a same-origin check and zod body validation. Upstream error messages are no longer echoed to the client (502).
- **Checkout hardening** (`src/app/api/checkout/route.ts`): same-origin check, zod body validation, 128-bit random order ids (`SUB_<hex>`), the owner's real email sent to Cashfree, generic 502 on upstream failure; the response includes the Cashfree `mode`.
- **`CASHFREE_ENV` (`sandbox` | `production`)** now selects the Cashfree API explicitly instead of `NODE_ENV`, so Vercel previews no longer hit live payments. Required for every billing path.
- **Login rate limits** split into independent per-IP (30 / 15 min) and per-email (5 / 15 min) buckets, replacing the per-IP+email key that allowed unlimited credential stuffing across accounts.
- **Prompt-injection hardening** (`src/server/ai-pipeline.ts`): conversation history is sent as real multi-turn messages (Gemini `user`/`model`, OpenAI-compatible `user`/`assistant`) instead of one flattened string. Customer text is wrapped in `<customer_message>` tags with delimiter-forging tags stripped. Business knowledge sits in `<business_data>`, and new system rules forbid following customer-supplied instructions, revealing the prompt, or quoting prices or policies not in `<business_data>`. The customer's phone number is no longer sent to LLM providers.
- **Security headers** (`next.config.ts`): Content-Security-Policy (allows only self, Google Fonts and Cashfree), `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS; `poweredByHeader: false`; removed the legacy `trueattendly.online` image remote patterns.
- **Dependencies**: upgraded `next` and `eslint-config-next` 16.2.10 → 16.4.0 (proxy bypass, Server Action DoS, image optimizer SSRF advisories) and ran `npm audit fix`. `npm audit --omit=dev` reports 0 vulnerabilities.

### Fixed - Reply Engine Stability
- Reply worker (`src/server/reply-worker.ts`): any exception after the quota reservation now releases the reserved reply exactly once and marks the message `failed`. An exception after a successful WhatsApp send marks it `done`, so the sweeper never sends a reply twice. New `Message.replyAttempts` counter: a message that keeps crashing is given up after 3 claims.
- Quota reservation now also requires `subscription.currentPeriodEnd` to be unset (trials) or in the future, so lapsed paid plans stop sending automated replies.
- Removed `vercel.json` to prevent Vercel Hobby tier deployment failure (`Hobby tier allows daily cron jobs only`). The sweeper endpoint (`/api/cron/reply-sweeper`) remains fully intact with constant-time `Bearer CRON_SECRET` validation for external cron triggers (e.g., cron-job.org).

### Added - Self-Serve WhatsApp Cloud API Connection
- Settings → WhatsApp Cloud Connectivity (`src/app/dashboard/settings/whatsapp-settings-client.tsx`): owners enter the Phone Number ID, WABA ID, display number and a permanent System User token, then click "Test & Connect". When connected, the card shows the number, the masked Phone Number ID and the WABA ID, with "Update credentials" (token optional, the stored token is reused) and "Disconnect" (`CustomConfirm`). An `error` status shows Meta's last error and a reconnect form. Staff see a read-only card.
- `saveWhatsAppConfigAction` (`src/app/dashboard/settings/actions.ts`): owner-only and zod-validated, limited to 10 attempts per 15 minutes per tenant. It runs a live Graph API handshake (`linkWhatsAppNumber` in `src/server/meta-graph.ts`): it reads the phone number, checks that it belongs to the WABA, and subscribes the app to the WABA (`POST /{waba}/subscribed_apps`) so webhooks arrive. The token goes in a Bearer header, not the query string. The typed display number must match Meta's record. The token is AES-256-GCM encrypted before it is stored. A number already bound to another tenant is rejected (unique index → E11000). On success the status becomes `connected`, `botEnabled` is set to true, `lastError` is cleared and the tenant-resolver cache is invalidated.
- `disconnectWhatsAppAction`: owner-only. Sets the status to `disconnected` and `botEnabled` to false, and removes `accessTokenEnc` and `phoneNumberId`, so webhooks stop routing to the tenant and the number can be linked again.
- The dashboard "WhatsApp Not Connected / Connection Error" banner now links to Settings instead of support.

### Added - Billing UI
- Settings → Plan & Usage (`src/app/dashboard/settings/billing-settings-client.tsx`, replaces `billing-plans.tsx`): plan badge and price, a reply-usage progress bar (`role="progressbar"`, with a percentage), and the period end date formatted on the server in `en-IN` and the tenant timezone. A lapsed period shows as "expired". Starter / Growth / Pro cards come from `PLAN_CONFIG` and show the reply quota and features. Buttons read Current plan / Renew / Upgrade / Switch.
- Checkout opens the Cashfree v3 drop-in as a modal (`redirectTarget: '_modal'`, SDK loaded on demand). When it resolves with `paymentDetails`, the page calls `/api/checkout/verify`, polling while the order is still `ACTIVE`, then shows a toast and refreshes the page. Redirect-based methods still verify through the `?order_id=` return URL. A 409 (already applied by the webhook) counts as success. Owner-only, and a 503 shows a "contact support" message.

### Fixed - UX, Accessibility & Content
- Knowledge base: fully blank FAQ/service rows are dropped before save; partially filled rows are flagged inline and block submission; server-side `safeParse` returns readable, field-specific messages (e.g. "FAQ #2: answer is required") instead of raw zod JSON; unexpected errors are logged and replaced with a generic message; empty price/duration now means "not set" instead of 0.
- Landing demo CTA and footer use `NEXT_PUBLIC_DEMO_WHATSAPP_NUMBER` instead of the placeholder `919876543210`; the demo link is hidden when unset.
- Dead ends removed: the forgot/reset password pages show a static "contact support" notice instead of forms posting to 501 endpoints.
- Accessibility: pinch-zoom restored (removed `maximumScale` / `userScalable`); every auth, knowledge, lead and confirm-dialog field has a linked label; `role="alert"` / `aria-live` on errors and status messages; `aria-pressed` on filter pills; the confirm dialog closes on Escape, manages focus and has `aria-labelledby` / `aria-describedby`.
- Hydration: lead, conversation and dashboard dates are formatted with `en-IN` and the tenant timezone; pricing uses `en-IN`; `OfflineBanner` uses a server snapshot of "online".
- Tailwind v4: custom component classes moved into `@layer components` (utilities override them again); `--font-sans` now resolves to Inter; removed dead legacy CSS (Lenis, GSAP, dropzone, legacy status classes) and the unused Lexend Exa font.
- Pricing section renders from `PLAN_CONFIG`; removed the unsupported annual-billing toggle.
- Rewrote `public/llm.txt` and `public/llms-full.txt` for FrontLoop (they described the deprecated broadcast product); deleted the unregistered legacy `public/sw.js`.
- `.env.local.example` documents `CASHFREE_ENV` and `NEXT_PUBLIC_DEMO_WHATSAPP_NUMBER`.

### Changed - Landing Theme Applied App-Wide
- Replaced the legacy warm beige palette (`#F5F1EA`, `#3E3B36`, `#8B8378`, `#C4A896`, `#E8E3DA`) with the landing page's slate + green palette (`#F8FAFC`, `#0F172A`, `#64748B`, `#0AAF76`, `#E2E8F0`) across auth pages, the dashboard (shell, overview, leads, conversation, knowledge, settings, support), legal pages, error/404 pages, shared UI (confirm dialog, toasts, spinner, offline banner), and the landing Pricing/FAQ sections.
- Primary dark buttons are now the landing's green CTA (`#0AAF76` → hover `#089163`); the active sidebar link uses a green tint; auth error banners use a soft rose alert; quota bars and human-agent chat bubbles use brand green.

### Changed - Unified Brand Logo & Wordmark
- Added shared `BrandLogo` component (`src/components/ui/BrandLogo.tsx`): rounded app-icon mark plus a refined Inter 800 "Front**Loop**" wordmark with the logo's green→teal gradient, in `xs`/`sm`/`md`/`lg` sizes and light/dark tones.
- Used it in the landing header, global footer, all four auth pages, the dashboard "Powered by" footer, and the Privacy/Terms pages. This fixes header/footer links that still pointed to the deleted `logo-dark.png`.
- Generated icon assets from `logo.png`: `public/images/logo-mark.png`, `src/app/icon.png` (512px, replacing the wide wordmark image), `src/app/apple-icon.png`, `src/app/favicon.ico`, and a 1200×630 `public/images/og-image.png` for OpenGraph/Twitter cards. Removed the manual `icons` metadata in favour of Next.js file conventions.

### Changed - Brand Realignment & Logo Assets
- Integrated user-provided `logo.png` universally across the application:
  - Deployed to both `/public/logo.png` and `/public/images/logo.png`.
  - Configured high-resolution browser tab icon and multi-size `favicon.ico` in `/public` and `/src/app/icon.png`.
  - Replaced legacy text placeholders and dead asset links across Landing page header, Global footer, Auth portals (Login, Register, Forgot Password, Reset Password), Dashboard shell, and OpenGraph/Twitter social cards.
- Rebranded application universally to **FrontLoop** across metadata, headers, landing page, auth views, dashboard shells, and legal documents.
- Updated default database target and JWT issuer/audience to `frontloop`.

### Added - Phase 4: Production Setup, Operational Tooling, and End-to-End Verification
- `.env.local.example` documenting every variable validated by `src/server/env.ts`, with generation commands and rotation notes (`.gitignore` now un-ignores it).
- `npm run db:seed` (`scripts/seed-tenant.ts`): idempotent seeder for the "Al-Shifa Family Health Clinic" demo tenant — owner login (bcrypt cost 12), active Starter plan (1,000 replies), and a full knowledge base (4 FAQs, 3 services priced in paise, Mon–Sat 09:00–13:00 + 16:30–20:30 split shifts, English/Manglish persona). Re-runs reuse existing records, `--reset-kb` restores the baseline KB, `SEED_WA_ACCESS_TOKEN` attaches an encrypted token, and it refuses to plant the default password when `NODE_ENV=production`.
- `npm run test:webhook` (`scripts/test-webhook-flow.ts`): end-to-end harness against a running app — verify-token handshake, forged-signature rejection, signed ingestion latency budget, Lead/Message persistence, redelivery idempotency, and background worker completion including the outbound reply.
- `src/server/business-hours.ts`: renders weekly hours plus a code-computed OPEN/CLOSED verdict and next opening (tenant timezone via `Intl.DateTimeFormat`, date exceptions honoured) for the AI prompt and the "Test Your Bot" sandbox.
- Cursor pagination on `/dashboard/leads` (URL-safe `?cursor=`), "AI Replies This Cycle" quota card on `/dashboard`, and a split-shift editor (up to 4 slots/day, overlap and ordering validation) on `/dashboard/knowledge`.
- `src/lib/plans.ts`: single plan catalogue shared by checkout, payment verification, the Cashfree webhook, and Settings.

### Changed - Phase 4
- `npm run db:indexes` now runs under `tsx --conditions=react-server`, reuses `src/server/db.ts`, reconciles all models in parallel, reports per-collection index counts, and supports `--dry-run`.
- AI pipeline: Tier 1 moved to `gemini-2.5-flash` (Gemini 1.5 models are retired) with header-based API key; strict output contract `{ reply, intent, name, requirement, handoff }`; prompt forbids inventing prices/timings and carries business hours; `handoff: true` pauses the bot for the lead.
- Reply worker: subscription quota is reserved atomically in MongoDB before sending and released on send failure (previously checked against a 60s-cached counter); burst coalescing replies only to the newest customer message; history window raised to 20 messages; inbound is marked `done` immediately after dispatch to narrow the duplicate-send window.
- Reply sweeper expires `pending` messages older than the 24-hour service window instead of retaining them indefinitely.
- Leads CSV export streams rows from a database cursor and validates the `status` filter.
- Growth plan quota aligned to the advertised 3,500 replies (billing previously granted 3,000).
- `GRAPH_API_VERSION` defaults to `v21.0` in the env schema (removes a hidden `v22.0` fallback in `meta-graph.ts`).

### Fixed - Phase 4
- **Security:** WhatsApp webhook accepted unsigned payloads when `META_APP_SECRET` was unset; it now fails closed. Webhook verify token and cron bearer token are compared in constant time (`safeEqual`).
- **Security:** Lead Server Actions validate lead id, status, and notes with Zod; plan lookups use an own-key guard (`isPlanKey`) so inherited keys such as `constructor` are rejected.
- Webhook lead upsert uses `$max` for `lastInboundAt`/`lastMessageAt` (out-of-order deliveries no longer move timestamps backwards) and Meta redeliveries no longer inflate `messageCount`.
- Knowledge base saves never incremented `version` (`$inc` was nested inside `$set`) and wiped `hours.exceptions`; split shifts were silently collapsed to one slot by the hours editor; saves overwrote stored `captureFields`/`languages`.
- Leads table kept stale rows after changing filters; total count ignored the phone search; invalid lead ids returned 500 instead of 404; status changes did not roll back on failure.
- Dashboard "Active FAQs" counted disabled FAQs.
- Handoff keywords match on Unicode word boundaries (works for Malayalam/Devanagari keywords).
- Worked around a Next.js 16.2.10 production-minifier bug that turned a `{ timeZone }` shorthand inside an inlined function into a `ReferenceError`.

### Removed - Phase 4
- Unused dependencies: `axios` (prohibited by AGENTS.md), `@ai-sdk/google`, `papaparse`, `@types/papaparse`, `recharts`, `gsap`, `lenis`, `date-fns`, `resend`.
- Dead components `LocationAutocomplete`, `Skeleton`, `BackButton`, and `utils/safeStorage`; unused imports across landing and dashboard (ESLint now reports 0 problems). The landing page is a Server Component again.

### Added - Phase 3: Landing Page Realignment, Billing Adaptations, and Production Readiness
- Public landing page CRO & visual overhaul (`src/app/page.tsx` & `src/components/landing/*`):
  - Completely redesigned landing experience with high-converting dark Obsidian aesthetic and emerald/slate accents.
  - High-impact above-the-fold hero section ("Stop Losing Business to Unanswered WhatsApp Messages") with interactive simulated WhatsApp chat preview displaying after-hours patient scheduling and fee quoting.
  - Added primary "Start Free Trial" CTA and interactive "Chat with Live Demo Bot" direct WhatsApp trigger (`wa.me/...`).
  - Added visual side-by-side Before & After comparison ("The Old Way" vs. "The Attendly AI Way").
  - Built interactive Industry Verticals showcase (`IndustryVerticalsSection.tsx`) with workflow tabs and ROI metrics for Clinics & Doctors, Coaching & Institutes, Salons & Wellness, and Local Services.
  - Highlighted competitive moats (Manglish & regional phrasing, 1-click human takeover, anti-hallucination knowledge guardrails, exportable lead CRM).
  - Designed interactive Pricing table (`PricingSection.tsx`) with dynamic Monthly/Annual toggle and explicit Meta Cloud cost transparency.
  - Implemented interactive objection-handling accordion FAQ (`FaqSection.tsx`).
  - Built authoritative Global Footer (`GlobalFooter.tsx`) with real-time green system status pulse indicator, legal links, and compliance disclosures.
  - 100% statically optimized with zero database overhead on public hits.
- Subscription & Billing adaptations (`src/app/api/checkout`, `src/app/api/checkout/verify`, `src/app/api/webhook/cashfree`):
  - Re-anchored checkout and payment workflows directly to `BusinessTenant.subscription` (`status: "active"`, `plan`, `currentPeriodEnd`, `replyQuota`).
  - Constant-time Cashfree webhook HMAC verification (`verifyCashfreeSignature`) using `crypto.timingSafeEqual` in `src/server/crypto.ts`.
- Production Hardening & SEO:
  - Added rate limiting and CSRF origin guards to `/api/auth/forgot-password`.
  - Updated root layout metadata and `public/robots.txt` aligned with product truth.
  - Purged unused legacy landing components in `src/components/landing`.
  - Rebuilt Settings view (`/dashboard/settings`) displaying live subscription tier, reply quota usage progress, and WhatsApp Cloud connectivity.

### Added - Phase 2: Tenant Setup, Knowledge Base Configuration, and Leads Dashboard
- Dedicated Tenant Data Access Layer (`src/server/repos/tenant.ts`) exposing scoped `forTenant(tenantId)` methods:
  - Validated `KnowledgeBase` upsert with Zod and 60,000 char budget checks.
  - Cursor-paginated query of `Lead` records by `lastMessageAt` and status.
  - Streaming leads queries for CSV export.
  - Instant `botPaused` toggle for human takeover.
- Business Knowledge Base management UI at `/dashboard/knowledge`:
  - Freeform business context text area (max 8,000 chars).
  - Structured FAQ manager with add/remove/toggle active states.
  - Services/treatments catalog with fee in minor currency units and durations.
  - Weekly operating schedule editor with opening/closing hours.
  - Bot persona, fallback reply, and handoff keyword settings.
  - Integrated "Test Your Bot" sandbox panel running AI simulation with zero Meta API dispatches.
- Leads and Conversation management UI at `/dashboard/leads`:
  - Pipeline table with status badges (`new`, `contacted`, `converted`, `lost`), intent badges, and phone-prefix search.
  - `/dashboard/leads/[id]` conversation view showing chronological message bubbles (Customer, AI Agent, Staff) with real-time `botPaused` human takeover toggle and internal staff notes.
  - Streamed CSV export at `/api/leads/export` with CSV/formula injection prevention.
- Updated Dashboard Shell and overview page with leads metrics, active FAQs/services counts, and quick navigation.

### Added - Phase 1: WhatsApp Ingestion Pipeline, Meta Cloud API, and Background Processing
- Production-ready Meta WhatsApp webhook endpoint at `app/api/whatsapp/webhook/route.ts` with legacy redirect at `app/api/webhook/whatsapp/route.ts`.
- Constant-time cryptographic HMAC verification for `x-hub-signature-256` using `crypto.timingSafeEqual` in `server/crypto.ts`.
- Webhook GET challenge handler for `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- Webhook POST synchronous ingestion pipeline:
  - In-memory TTL tenant resolver (`server/tenant-resolver.ts`) caching `BusinessTenant` by `metadata.phone_number_id` and decrypting stored Meta tokens via AES-256-GCM.
  - Monotonic delivery receipt state updates (`sent` -> `delivered` -> `read` -> `failed`).
  - Idempotent `Lead` upsert with E.164 phone normalization, contact profile caching, and message timestamps.
  - Inbound `Message` creation with unique `waMessageId` constraint and graceful `E11000` duplicate skip.
  - Fast-return `200 OK` response to Meta.
- Asynchronous reply execution via Next.js `after()` (`server/reply-worker.ts`):
  - Atomic message state claim (`replyState: "pending"` -> `"processing"`).
  - Multi-gate safety checks: 24-hour customer service window, tenant `botEnabled`, lead `botPaused` (human takeover), fixed-window rate limits (15/min lead, 120/min tenant), and subscription quota.
  - Dynamic knowledge base retrieval (`KnowledgeBase`) and chronological conversation history aggregation.
  - Multi-tier LLM generation fallback pipeline (`server/ai-pipeline.ts`): Gemini 1.5 Flash -> Groq LLaMA 3.3 70B -> Cerebras LLaMA 3.3 70B -> static safe business fallback.
  - Outbound text dispatch via Meta Graph API using native `fetch` with `AbortSignal.timeout(10000)` (`server/meta-graph.ts`).
  - Outbound message persistence, inbound message completion (`replyState: "done"`), quota increment, and lead requirement/intent extraction.
- Reply sweeper cron endpoint at `app/api/cron/reply-sweeper/route.ts` (Bearer `CRON_SECRET`) self-healing stalled `processing` (>2 min) and orphan `pending` (>10s) messages using cross-tenant database queries.

## [0.1.0] - 2026-10-11

### Changed - Phase 0: Database & Core Foundation Migration
- Completely removed legacy PostgreSQL, Supabase client SDKs, and Prisma ORM dependencies.
- Established clean MongoDB backend with Mongoose 9, connection pooling, and Vercel Fluid compute support (`server/db.ts`).
- Enforced strict tenant isolation on all tenant models (`Lead`, `Message`, `KnowledgeBase`) via `tenantGuard` Mongoose plugin.
- Implemented native serverless authentication:
  - Custom JWT session management with `jose` stored in HTTP-only, SameSite cookies.
  - Salted password hashing with `bcryptjs`.
  - Type-safe, fail-closed environment variable validation with `zod` (`server/env.ts`).
  - AES-256-GCM token encryption (`server/crypto.ts`).
  - Fixed-window atomic rate limiting in MongoDB (`server/rate-limit.ts`).
- Scaffolding of core tenant data models:
  - `User`: Global accounts with email uniqueness and hashed passwords.
  - `BusinessTenant`: Multi-tenant business profiles, WhatsApp phone mapping, and subscription quotas.
  - `Lead`: Customer leads indexed by `(tenantId, phone)` with status, intent, and message counters.
  - `Message`: Conversational messages indexed by unique `waMessageId` and `(tenantId, leadId)`.
  - `KnowledgeBase`: Business FAQs, services, hours, bot persona, and handoff settings.
  - `RateLimit`: TTL-indexed sliding rate buckets.

