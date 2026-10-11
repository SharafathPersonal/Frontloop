# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 3: Landing Page Realignment, Billing Adaptations, and Production Readiness
- Public landing page realignment (`src/app/page.tsx`):
  - Completely stripped legacy dead-stock, broadcasting, and billing components.
  - Reframed for SMB offline front desks (Clinics, Coaching Centers, Salons, Local Services) highlighting 24/7 AI Receptionist & Lead Qualifier capabilities.
  - Added direct "Try Live WhatsApp Demo" interactive trigger (`wa.me/...`).
  - Implemented transparent Done-For-You monthly pricing tiers (Starter / Growth plans).
  - 100% statically generated with zero database queries and minimal client bundle overhead.
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

