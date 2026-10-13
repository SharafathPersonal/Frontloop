# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Digital Front-Desk Hub, Web Chat & QR Kit
- **Public hub `/d/[tenantId]`**:
  - mobile-first landing with the business name, category and a "24/7 AI Receptionist" badge;
  - "Chat on WhatsApp" (`wa.me/<number>?text=Hi`), shown only while the tenant's number is connected;
  - "Chat on Web", plus a native share button that falls back to copying the link;
  - unknown tenants render a "Front Desk Offline" state. `noindex`.
- **Web chat `/d/[tenantId]/chat`** (`/chat/[tenantId]` redirects here):
  - **Lead gate:** name (2 to 50 characters) and a 10-digit Indian mobile number, normalised to `91XXXXXXXXXX` by `src/lib/phone.ts`.
  - **Chat screen:** pinned to `100dvh` with a sticky header and composer, safe-area padding, and `viewport-fit=cover` plus `interactive-widget=resizes-content` for the Android keyboard.
  - **Feed:** stays pinned to the newest message when the keyboard resizes it.
  - **Composer:** auto-growing textarea; Enter sends on desktop (IME-safe) while touch keyboards keep Enter as a newline; typing indicator.
  - **Messages and controls:** optimistic bubbles, "Talk to a person" and "End chat".
  - **Timestamps:** shown in the tenant's time zone via `src/lib/clock.ts`, so server and browser render identically (no hydration mismatch).
  - An existing session resumes on the server with no loading flash. Web chat is offline when the trial or plan has lapsed; it does not depend on WhatsApp being connected.
- **Guest sessions** (`src/server/auth/guest-session.ts`): HS256 JWT `{ sub: leadId, tid, sid, role: 'web_guest' }` with a separate audience, so it can never pass as a staff session (verified). 24-hour TTL in an HttpOnly, per-tenant cookie (`__Host-flchat_<tenantId>` in production). The token never touches page JavaScript or `sessionStorage`.
- **APIs:**
  - `POST /api/chat/session`: same-origin check, 10 sessions per IP per hour, upserts the lead with `source: 'web_widget'`.
  - `DELETE /api/chat/session`: ends the session.
  - `POST /api/chat/message`: guest JWT, `z.string().trim().min(1).max(2000)`, 60 messages per IP per 10 minutes, `maxDuration = 60`.
- **Web chat engine** (`src/server/web-chat.ts`): the same rules as WhatsApp:
  - shares the per-lead and per-tenant rate-limit buckets;
  - reserves and releases quota through the extracted `reserveReplyQuota()` / `releaseReplyQuota()` (`src/server/quota.ts`, now also used by the reply worker); no charge for canned fallbacks, `[AI_DOWN]` logging;
  - applies the same handoff keywords and the `generateAIReply()` pipeline with the shared `knowledgeContext()` (`src/server/ai-context.ts`).
  A handoff or "Talk to a person" sets `botPaused` and shows "Our team will contact you on your phone shortly."
- **Privacy: the typed phone number is unverified.** If it matches an existing WhatsApp lead the records merge, but:
  - web history and AI context are scoped to the random per-session `webSessionId`, never the whole lead, so a visitor typing someone else's number sees nothing of that person's WhatsApp chat or earlier web sessions (verified);
  - an existing lead's name is never overwritten;
  - web messages never set `lastInboundAt`, so they cannot open a WhatsApp reply window;
  - the WhatsApp worker and sweeper ignore `channel: 'web'` rows, which are never `pending` and so can never be sent over WhatsApp.
- **Models:** `Message.channel` (`whatsapp` | `web`; absent means WhatsApp) and `Message.webSessionId`; `Lead.source` (`whatsapp` | `web_widget`).
- **Dashboard QR kit `/dashboard/qr`** (new nav item "Front Desk & QR"):
  - QR code via `qrcode.react` (zero dependencies), copy link, native share, "Share via WhatsApp", open page;
  - downloads: a 4 x 6 inch printable card as PNG (1200 x 1800, 300 dpi) or SVG, and QR-only SVG, all generated in the browser;
  - status of the WhatsApp button and of web chat.
- **Dashboard overview card:** front-desk link, QR preview and copy button.
- **Leads:** a Web tag in the table, and "Web chat" labels on messages in the conversation view. The locked composer offers a call link for web-only leads.
- `Spinner` takes a `tone` prop instead of conflicting border classes.
- Verified on a local test stack:
  - 26 API, privacy and quota checks;
  - 11 headless-Chrome checks at 360px: no horizontal overflow on the hub, gate, chat, dashboard and QR kit; composer pinned; keyboard emulation at 360 x 400 keeps the header, composer and newest message visible; textarea auto-grows; 16px inputs;
  - PNG, SVG and QR exports produce valid files.

### Added - Email OTP Engine (nodemailer)
- **SMTP transport** (`src/server/email/mailer.ts`): `nodemailer` 10 singleton with implicit TLS on port 465 and required STARTTLS on other ports, plus 10 to 15 s connection, greeting and socket timeouts. Fails closed: `requireEnv` throws when `SMTP_HOST`, `SMTP_USER` or `SMTP_PASS` is missing, and routes return 503 before doing any work.
- New env vars in `src/server/env.ts` and `.env.local.example`: `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (default `FrontLoop <trueattendly@gmail.com>`). Removed the unused `RESEND_API_KEY`.
- **Email templates** (`src/server/email/templates.ts`): text and table-based HTML for signup verification and password reset, with the 10-minute expiry and an "if you did not request this, ignore this email" disclaimer.
- **`OtpToken` model**: one live code per (email, purpose), unique index on `{ email, purpose }`, TTL index on `expiresAt`. Codes are stored only as an HMAC-SHA256 keyed from `AUTH_SECRET` and bound to email and purpose; pending signup details are AES-256-GCM encrypted. Run `npm run db:indexes` so the TTL index exists in production.
- **`generateAndSendOtp` / `verifyOtp`** (`src/server/auth/otp.ts`):
  - codes come from `crypto.randomInt(100000, 1000000)`, last 10 minutes, and can be resent only after 60 s, enforced atomically by the upsert;
  - an SMTP failure deletes the code and throws;
  - verification spends one attempt atomically before comparing in constant time, so even parallel guesses cannot exceed 5 per code; the fifth failure deletes the code;
  - a correct code is consumed by a hash-conditioned delete, so of two simultaneous submissions only one succeeds.
  Verified against a local MongoDB: storage, cooldown, single use, lockout, parallel guessing, double submit, expiry and SMTP failure.
- **Password policy** (`src/lib/password-policy.ts`): at least 8 characters with an uppercase letter, a lowercase letter and a number, shared by the registration and reset forms and APIs.

### Changed - Two-Step Email-Verified Registration
- `POST /api/auth/register/send-otp`:
  - validates business name, category, email, password and confirmation, and refuses already-registered emails;
  - rate limits per IP (5/hour) and per email (3/15 min);
  - bcrypt-hashes the password (it is never stored in plaintext, even encrypted) and emails a code.
- `POST /api/auth/register/verify-otp`: verifies the code (IP limit 20/15 min), re-validates the decrypted pending signup, creates the tenant on a 14-day trial with an enforced `currentPeriodEnd`, the owner and the knowledge base (via the new `src/server/auth/workspace.ts`), signs the user in and returns `{ ok: true, redirect: '/dashboard' }`.
- **Removed `POST /api/auth/register`**, which created accounts without email verification.
- Register page is a two-step flow: details, then a 6-digit code entry. The new `OtpInput` component auto-advances, supports Backspace, arrow keys and pasting the full code, offers `one-time-code` autofill and submits automatically on the sixth digit. A 60-second resend countdown (`useCountdown`) and a "Change email" option are included. The page has server metadata and `noindex`.

### Changed - Password Reset Lifecycle
- `POST /api/auth/forgot-password` replaces the 501 stub:
  - enumeration-safe: always returns "If an account exists with this email, an OTP has been sent.";
  - does identical work for known and unknown emails before responding, and sends the email in `after()` so SMTP latency cannot reveal whether an account exists;
  - rate limits per IP (10/hour) and per email (3/15 min).
- `POST /api/auth/reset-password` replaces the 501 stub:
  - verifies the code and the password policy, then sets the bcrypt hash (cost 12) and bumps `sessionVersion` in one atomic update, revoking every existing session on every device;
  - clears the caller's session cookie and lifts that email's sign-in lockout.
- `/auth/forgot-password` is a two-step form: email, then code plus new password. On success it goes to `/auth/login?reset=1`, which shows a confirmation. `/auth/reset-password` now redirects there.

### Added - Platform Admin
- `/admin` overview (`src/app/admin`, `src/server/repos/platform.ts`):
  - tenants: total, active and ended trials, paying tenants by plan;
  - WhatsApp connection states;
  - messages: total, inbound, AI and staff replies, and failures in the last 24 hours, plus current pending and processing counts;
  - MongoDB ping latency;
  - reply-sweeper health, derived from the oldest pending reply and replies stuck in `processing`;
  - the newest workspaces.
  Cross-tenant message counts opt out of `tenantGuard` explicitly and use index-backed `_id` and `replyState` ranges.
- Guards:
  - **proxy:** `/admin` without a session goes to `/auth/login?redirect=/admin`, and a signed-in owner or staff member goes to `/dashboard`;
  - **admin layout:** `requirePlatformAdmin()` re-checks the role and `sessionVersion` against the database;
  - **dashboard:** `requireTenant()` sends platform admins to `/admin`.
  The proxy does not redirect `/dashboard` on the JWT role, to avoid loops on stale tokens.
- Login returns a role-based `redirect`, and the login page honours `?redirect=` (or the legacy `?next=`) only inside the area that role can use.
- `npm run db:admin` (`scripts/create-admin.ts`) creates or resets a platform admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (at least 12 characters plus the password policy). It refuses to promote tenant accounts and revokes the admin's existing sessions on reset. No web route can grant the role.

### Added - Human Takeover Replies & Needs Human Queue (audit C1)
- **Staff replies from the dashboard** (`sendAgentReplyAction` in `src/app/dashboard/leads/actions.ts`, `sendAgentReply` in `src/server/repos/tenant.ts`): owners and staff send WhatsApp replies through the tenant's own number. Text is zod-validated (trimmed, 1 to 4,096 chars). Sends are refused outside Meta's 24-hour customer-service window (also on Meta error 131047), and Meta error 190 flags the connection as `error`. Messages are stored with `author: 'agent'`. Agent replies never touch `subscription.repliesUsed`. Sending also pauses the bot on that lead so the AI cannot answer over a human.
- **Conversation composer** (`lead-conversation-client.tsx`): textarea and Send button with spinner, Enter to send, Shift+Enter for a new line (IME-safe), inline errors, and auto-scroll to the newest message on load and after each send. When the 24-hour window is closed (computed on the server), the composer is replaced with an explanation of Meta's rule.
- **Needs Human filter** (`src/app/dashboard/leads/filters.ts`, leads page, table and CSV export): lists bot-paused leads sorted by `lastInboundAt` descending, with cursor pagination. The lead cursor is now `{ at, _id }` so it works for either sort field. New index `{ tenantId, botPaused, lastInboundAt: -1, _id: -1 }`: run `npm run db:indexes` on deploy.
- **Shared 24-hour window helper** (`src/lib/whatsapp-window.ts`) now used by the reply worker, sweeper, repo and lead page.

### Changed - Handoff Keyword Hygiene
- Default handoff keywords are now multi-word phrases (`talk to a human`, `speak to a person`, `human agent`, `call me back`) in `src/lib/bot-defaults.ts`. The old single-word defaults (`human`, `agent`, `call me`) paused the bot on ordinary sentences. Knowledge bases still holding the untouched legacy default are upgraded at read time by `resolveHandoffKeywords()`; customised lists are kept.
- Keywords are validated: 4 to 40 characters each, at most 20. `languages` is bounded too (2 to 20 characters, at most 10).

### Security - Logout & Session Revocation (audit H1)
- `clearSessionCookie()` overwrites the cookie with `maxAge: 0` and `Secure` instead of calling `cookies().delete()`, which omitted `Secure`; browsers ignore a `__Host-` cookie set without it, so logout never cleared the session in production.
- `POST /api/auth/logout` now bumps the user's `sessionVersion`, revoking every JWT already issued to that user (all devices).

### Fixed - Billing Snapshots, Atomic Fulfilment & Renewals (audit H2, H3, M11)
- **Pending-order snapshot**: `POST /api/checkout` writes a `Payment` row (`status: 'pending'`, plan, `amountINR`, `replyQuota`) before creating the Cashfree order, and removes it if Cashfree rejects the order. Fulfilment validates the paid amount and plan against this snapshot, never the live `PLAN_CONFIG`, so a price change can no longer reject an order the customer already paid. Orders created before this release (no snapshot) fall back to the live-price check.
- **Transactional fulfilment** (`src/server/billing.ts`): the `Payment` flip to `applied` and the tenant upgrade commit in one MongoDB transaction, so a crash between them rolls both back and a retry re-applies instead of reporting a false "duplicate". Concurrent webhook and verify calls write-conflict and the loser resolves to `duplicate`. **Requires a replica set** (Atlas, or local `mongod --replSet rs0`; see `.env.local.example`).
- `OrderTagsSchema.plan` is format-checked only; the snapshot is the authority, so a plan retired mid-payment is still recognised.
- **Same-plan early renewal** extends from the current period end (`nextPeriodEnd()` in `src/lib/plans.ts`); plan switches, lapsed plans and trial upgrades start a fresh 30-day period. Settings, Terms and the refund policy describe this.
- `Payment` gained `status`, `replyQuota`, `appliedAt`; `source` and `periodEnd` are now set at fulfilment. Legacy rows without `status` are treated as applied.

### Fixed - Reply Engine Fairness & Background Execution (audit H6, H7)
- When every LLM tier fails and the canned fallback is sent, the reserved reply is released (no quota charged), the message is noted `AI provider unavailable: fallback sent`, and `[AI_DOWN]` is logged with `console.error` for log-drain alerting.
- The WhatsApp webhook schedules one `after()` per inbound message instead of one serial loop, so a burst no longer outlives the function's max duration.
- The reply sweeper exports `maxDuration = 60`, stops claiming work after a 45-second budget (reporting `deferredCount`), and processes at most 15 messages per run.
- `.env.local.example` documents that the sweeper must be scheduled externally (cron-job.org or Upstash QStash, every 1 to 2 minutes), since `vercel.json` cron was removed.

### Fixed - Trial Enforcement & Plan Single Source of Truth (audit M1, M9, M10)
- Registration sets `subscription.currentPeriodEnd` to 14 days out, so the existing quota reservation stops trial replies when the trial ends. Settings shows "Free trial ends <date>". Trials created before this release have no end date and are unaffected.
- `src/lib/plans.ts` now holds `TRIAL_CONFIG` (14 days, 300 replies), `BILLING_PERIOD_DAYS`, `PLAN_KEYS`, shared `PLAN_FEATURES` and per-plan audience, tagline and extras. `SUBSCRIPTION_PLANS` and the trial quota default derive from it.
- The landing pricing section maps over every plan, so Pro (₹7,999) is now shown. Cards say "AI Replies per month" (the quota counts replies, not conversations) and list only features the product has; every plan has the same features and differs by reply allowance and onboarding help.

### Security - Tenant Guard Hardening (audit M8)
- `tenantGuard` accepts only an ObjectId or a 24-hex string as `tenantId`; operator filters such as `{ $ne: null }` or `{ $exists: true }` are rejected. Aggregations containing `$lookup`, `$unionWith` or `$graphLookup` require `{ crossTenant: true }`.
- `tenantId` is `immutable: true` on `Lead`, `Message`, `KnowledgeBase` and `Payment`.

### Changed - Marketing Copy Grounded in Product Truth (audit H4)
- Landing hero, trust strip, problem/solution and feature cards: removed the unsourced "40% of inquiries" headline, "books appointments", "Zero Hallucinations", "Meta Cloud API v21", "real time" and the internal `botPaused` identifier. The copy now describes answering from the knowledge base, intent qualification, lead capture and human handoff.
- Industry verticals: removed fabricated ROI statistics (74%, 3.4x, 22 hrs, 100%), slot locking, deposit payments, reminders and brochure or location-pin dispatch; mock chats capture the request for staff to confirm, and the panel is labelled as an illustrative example.
- FAQ: no "zero ban risk" or "notifies your team" claims; describes the dashboard reply flow and the 24-hour window.
- WhatsApp demo simulator: the bot notes the request for the front desk to confirm instead of confirming a booking.
- `llms.txt` and `llms-full.txt`: no preferred-slot extraction or appointment booking claims; human takeover describes dashboard replies.
- Root meta description and dashboard welcome text updated to match.

### Changed - Legal Pages (audit H5)
- **Privacy Policy** rewritten for the DPDP Act 2023: fiduciary and processor roles, data collected, the end-customer message flow, purposes, a processor table (MongoDB Atlas, Vercel, Meta, Google Gemini, Groq, Cerebras, Cashfree), retention, security, rights, and a grievance contact.
- **Terms of Service** rewritten: trial, 30-day prepaid plans, reply counting, renewals, WhatsApp Business Policy acceptable use, AI response disclaimer, liability cap, termination, governing law (Kozhikode courts). Removed the legacy broadcast, credits and `is_blocked` text.
- The register page links the Terms and Privacy Policy.

### Changed - Accessibility, Loading & Error States (audit M4, M6, M12)
- Brand green `#0AAF76` (2.84:1 against white) replaced with `#047857` (5.48:1) across `src`, and its hover `#089163` with `#065F46`. The dashboard WhatsApp button uses dark text on `#25D366`.
- Mobile navigation drawer is `inert` while closed, closes on Escape, moves focus to a labelled "Close menu" button when opened, and the menu button exposes `aria-expanded`/`aria-controls`.
- New `src/app/dashboard/loading.tsx` skeleton and `src/app/global-error.tsx`. `src/app/error.tsx` no longer prints raw error messages; it shows only the opaque digest as a support reference.

### Added - Landing Conversion, PWA & SEO/GEO Layer
- **Landing hero and copy** (`src/app/page.tsx`): new hook headline, subheadline and trust strip (Zero Hallucinations, Strict Data Isolation, Meta Cloud API v21, Live Human Handover). The primary CTA "Experience Live WhatsApp Demo" opens `wa.me/919400160928`; the secondary CTA is "Start Free Trial". Rewrote the problem/solution section as "The Cost of Slow Replies" and added a dark live-demo banner. Fixed a 360px horizontal overflow: the hero section now has `w-full`.
- **Interactive WhatsApp simulator** (`src/components/landing/WhatsAppDemoSimulator.tsx`): the chat replays message by message with a typing indicator and a Replay button. The full conversation is server-rendered for crawlers, and the replay is skipped under `prefers-reduced-motion`.
- **Central contact config** (`src/lib/config.ts`): `SITE_URL`, `CONTACT` (trueattendly@gmail.com, +91 9400160928, Calicut, Kerala, India, Mon - Sat 9:00 AM - 7:00 PM IST), `whatsappLink()` and `LIVE_DEMO_URL`. This replaces the env-gated `NEXT_PUBLIC_DEMO_WHATSAPP_NUMBER`, so the demo CTA is always shown.
- **Footer** (`src/components/landing/GlobalFooter.tsx`): 4 columns (About, Product & Solutions, Contact & Support, Legal & Trust) with the "Engineered in Calicut, Kerala" badge. Removed the fabricated "99.98% Gateway Uptime" / "All Systems Operational" status bar.
- **Public pages**: `/support` (contact channels, hours, location, status reporting) and `/refund-policy` (prepaid 30-day Cashfree periods, no auto-renewal, refund requests by email).
- **PWA**: `src/app/manifest.ts` (standalone, `start_url: /dashboard`, 192/512/maskable icons in `public/icons/`). `public/sw.js` caches only `/_next/static`, `/icons` and `/images`, never caches `/api/*` or page/dashboard responses, and serves `public/offline.html` for offline navigations. It is registered after load in production by `ServiceWorkerRegistrar`, and `/sw.js` is served with `Cache-Control: no-cache`.
- **SEO / GEO / AEO**: new root metadata (title, description, keywords, `en_IN` OpenGraph and Twitter cards with `og-image.png`, theme colour `#047857`). Per-page canonicals: home, support, privacy, terms and refund-policy each declare their own. Added `Organization` + `SoftwareApplication` JSON-LD with the Calicut address, contact point and an INR price range derived from `PLAN_CONFIG`. Added `src/app/sitemap.ts`. `robots.txt` now also disallows `/admin/`.

### Changed
- `public/llm.txt` renamed to `public/llms.txt` and rewritten (contact details, architecture: Next.js 16, Meta Cloud API v21.0, MongoDB, `after()` + sweeper pipeline). `llms-full.txt` contact lines updated.
- Dashboard support page: new phone, WhatsApp and email buttons, and support hours. Removed the TODO stub and the "24/7 concierge" claim.
- Support email `support@frontloop.online` → `trueattendly@gmail.com` (forgot/reset password pages and API message). Privacy policy no longer references PostgreSQL.

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
- `npm run db:seed` (`scripts/seed-tenant.ts`): idempotent seeder for the "Al-Shifa Family Health Clinic" demo tenant: owner login (bcrypt cost 12), active Starter plan (1,000 replies), and a full knowledge base (4 FAQs, 3 services priced in paise, Mon–Sat 09:00–13:00 + 16:30–20:30 split shifts, English/Manglish persona). Re-runs reuse existing records, `--reset-kb` restores the baseline KB, `SEED_WA_ACCESS_TOKEN` attaches an encrypted token, and it refuses to plant the default password when `NODE_ENV=production`.
- `npm run test:webhook` (`scripts/test-webhook-flow.ts`): end-to-end harness against a running app: verify-token handshake, forged-signature rejection, signed ingestion latency budget, Lead/Message persistence, redelivery idempotency, and background worker completion including the outbound reply.
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

