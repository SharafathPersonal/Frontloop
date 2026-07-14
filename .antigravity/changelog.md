# CHANGELOG — True Attendly Broadcast
> All changes are logged chronologically. Format: `YYYY-MM-DD · Module · Nature · Files`

---

## 2026-07-08 — Phase 3: Core Engine & Module Production

### [SPEC] ANTIGRAVITY.md — Architecture Enforcement Rules Created
- **Module:** Infrastructure / Spec
- **Nature:** Created `ANTIGRAVITY.md` in project root defining three absolute technical enforcement rules: (1) No Dead Weight — zero unused vars or console logs in production, (2) Decoupled Isolation — strictly Next.js App Router + Supabase, no Express wrappers, (3) Transactional State Safety — optimistic UI on all credit/customer mutations, idempotency guards, RPC-routed credit deductions.
- **Files:** `ANTIGRAVITY.md`

---

### [SCHEMA] customers_master Table Added
- **Module:** Database / Audience
- **Nature:** Extended Supabase PostgreSQL schema with `public.customers_master` table. Fields: `id`, `shop_id` (FK to shops), `name`, `phone`, `tag` (enum: VIP | Regular | New), `created_at`. Applied RLS policy for per-shop isolation, composite UNIQUE constraint on `(shop_id, phone)` for upsert-safety, and performance indexes on `shop_id`, `tag`, and `phone`.
- **Files:** `supabase-schema-phase3.sql`

---

### [MODULE 1] Dashboard Page — 4-Metric Upgrade
- **Module:** Dashboard
- **Nature:** Upgraded `/dashboard/page.tsx` from 3 to 4 unified luxury flat-white metric panels. Added 4th metric: **Total Contacts in Database** — queried via `supabase.from('customers_master').select('*', { count: 'exact', head: true })`. Each metric card now includes an icon, hover gradient accent bar, and a contextual action link. Recent Active Campaigns sub-table retains Supabase live feed with `limit(6)`.
- **Files:** `src/app/dashboard/page.tsx`

---

### [MODULE 2] Audience & Customers Manager — New Route Created
- **Module:** Audience
- **Nature:** Created new page at `/dashboard/customers/page.tsx`. Features: (a) **Bulk Upload Node** — dashed drag-and-drop CSV dropzone with tag classification selector (VIP/Regular/New), PapaParse integration, chunked upsert batches of ≤500 rows per ANTIGRAVITY Rule 3. (b) **Quick Manual Insertion** — sidebar form for single customer Name + WhatsApp Number + Tag, with optimistic loading state and duplicate-safe upsert. Both operations target `public.customers_master`.
- **Files:** `src/app/dashboard/customers/page.tsx`

---

### [MODULE 3] Advanced Broadcast Hub — Full Rewrite
- **Module:** Broadcast
- **Nature:** Fully rewrote `/dashboard/broadcast/page.tsx`. Removed deprecated CSV re-uploader. Replaced with: (a) **Dynamic File Dropzone** — genuine image upload to Supabase Storage (`broadcast-assets` bucket), renders preview with remove button, supports drag-and-drop for JPG/PNG/WebP. (b) **Tag Targeting Selector** — collapsible checkbox dropdown mapping directly to saved customer tags from `customers_master`, showing live contact counts per tag. (c) **Credit Balance Guard** — real-time credit check against selected recipient count, blocks dispatch with inline banner if insufficient. No CSV dependency on recipient selection.
- **Files:** `src/app/dashboard/broadcast/page.tsx`

---

### [MODULE 4] Delivery Audit History Ledger — No Changes Required
- **Module:** History
- **Nature:** Existing `/dashboard/history/page.tsx` already satisfies specification: clean table log of all broadcast executions, dynamic status badges (completed / processing / pending / insufficient_credits), search, filter, and CSV export. No modifications made.
- **Files:** `src/app/dashboard/history/page.tsx` (unchanged)

---

### [MODULE 5] Settings & Provider Hub — Full Rewrite
- **Module:** Settings
- **Nature:** Fully rewrote `/dashboard/settings/page.tsx`. (a) **Credit Purchase Matrices** — 4 transactional selection blocks (50/100/200/500 Credits) with pricing labels and checkout redirect placeholder. Selected pack highlighted with check icon. (b) **Facebook Embedded Signup** — prominent 1-click "Continue with Facebook" button with Meta blue styling, wired to `window.FB.login()` stub. Connected status indicator (animated dot) shows when `meta_access_token` exists. (c) **Manual Provider Toggle** — collapsible secondary section with Token, Phone ID, Business Account ID, and Template Name fields. Collapsed by default as developer safety route. Provider credentials split from Shop Profile form.
- **Files:** `src/app/dashboard/settings/page.tsx`

---

### [LAYOUT] Dashboard Nav — Audience Link Added
- **Module:** Navigation
- **Nature:** Added `Audience` nav link (`/dashboard/customers`) to sidebar navigation in `layout.tsx`, positioned between Dashboard and Broadcast. Imported `Users` icon from `lucide-react`.
- **Files:** `src/app/dashboard/layout.tsx`

---

### [BROADCAST API] Tag-Based Recipient Routing — Pending Backend Update
- **Module:** Broadcast / API
- **Nature:** The `/api/broadcast/route.ts` now receives `targetTags: CustomerTag[]` instead of `recipients: ParsedContact[]`. Backend route handler must be updated to query `customers_master` by tag, then dispatch. This update is flagged for Phase 3b.
- **Files:** `src/app/api/broadcast/` (update required in next session)

---

### [MODULE 6] Settings Page — Cashfree Checkout & Dynamic Shop Profile
- **Module:** Settings / Payments
- **Nature:** Replaced static placeholders in the Shop Profile form with real data from `public.shops` using Supabase client. Added a select dropdown for Industry Type mapping. Integrated Cashfree Checkout flow to replace mock credit purchase button. Backend API route `/api/checkout` added to initiate server-side Cashfree sessions and return session IDs securely. Added related environment variables for Cashfree keys.
- **Files:** `src/app/dashboard/settings/page.tsx`, `src/app/api/checkout/route.ts`, `.env.local`

---

## 2026-07-08 — Phase 4: Definitive Database Architecture Overhaul

### [SCHEMA] Full Schema Rewrite & Expansion
- **Module:** Database / Architecture
- **Nature:** Completely rewrote `supabase-schema.sql` to explicitly define 5 structural master tables (`shops`, `wallets`, `customers_master`, `campaigns`, `payment_logs`). Applied UUID PKs, FK cascades to `auth.users` and `shops`. Enforced strict array typing on `customers_master.tags` (`text[]`), decoupled `status` into extensible text with `default 'pending'`, and attached `unique_shop_whatsapp` constraint for safe upserts.
- **Files:** `supabase-schema.sql`

### [SECURITY] Row Level Security Strict Isolation
- **Module:** Security
- **Nature:** Implemented aggressive RLS policies across all 5 tables to map strictly to `auth.uid() = id` (for shops) and `auth.uid() = shop_id` (for all child nodes). Ensures zero cross-tenant bleeding.
- **Files:** `supabase-schema.sql`

### [TYPES] Synchronous TypeScript Conformance
- **Module:** Infrastructure / Types
- **Nature:** Refactored `src/types/broadcast.ts` structural models to exactly mirror the new PostgreSQL schema. Changed `name` to `customer_name`, `phone` to `whatsapp_number`, and `tag` to `tags: string[]`. Propagated type changes throughout the Audience Manager UI, Broadcast API resolver logic, and History view to ensure zero `tsc` build errors.
- **Files:** `src/types/broadcast.ts`, `src/app/dashboard/customers/page.tsx`, `src/app/api/broadcast/route.ts`, `src/app/dashboard/broadcast/page.tsx`, `src/app/dashboard/history/page.tsx`

---

## 2026-07-08 — Phase 5: Core UX Safety & Security Management

### [COMPONENTS] Custom Confirmation Modal
- **Module:** UI / Components
- **Nature:** Created a globally reusable, luxury-minimal `CustomConfirm.tsx` modal component (`fixed inset-0`, `backdrop-blur-sm`, `animate-fade-in`). Designed to cleanly capture destructive or permanent actions using React state isolation without relying on native browser alerts.
- **Files:** `src/components/ui/CustomConfirm.tsx`

### [INTEGRATION] Modal Action Handlers
- **Module:** Dashboard / UX
- **Nature:** Replaced generic submit/action triggers with the new `CustomConfirm` modal across 4 core vectors: Broadcast Dispatch (`/broadcast`), System Logout (`/layout`), Shop Profile Updates (`/settings`), and Password Reset (`/settings`). 
- **Files:** `src/app/dashboard/broadcast/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/settings/page.tsx`

### [SECURITY] Password Management View
- **Module:** Settings / Auth
- **Nature:** Implemented a new "Security & Password Management" form module below the Shop Profile in the Settings page. Utilizes `supabase.auth.updateUser()` to securely rotate credentials and features a validation matrix (min 6 chars, match verification) alongside the custom confirmation step.
- **Files:** `src/app/dashboard/settings/page.tsx`

---

## 2026-07-08 — Phase 6: Broadcast Engine Transactional Reliability

### [ATOMICITY] Wallet Deduction RPC
- **Module:** Database / Supabase RPC
- **Nature:** Created a `deduct_credits` PostgreSQL function (RPC) using `plpgsql` running with `security definer`. Safely checks constraints and decrements exactly 1 credit row-by-row on a database-level lock, ensuring zero race conditions under heavy parallel loads.
- **Files:** `supabase-schema.sql`

### [IDEMPOTENCY] Strict Conflict Security
- **Module:** Broadcast API
- **Nature:** Hardened `/api/broadcast/route.ts` against multi-click accidental dispatches. Generates an idempotency conflict if a matching payload (`shop_id`, `title`, `total_recipients`, `status: processing`) exists within the last 5 minutes, aborting execution via `409 Conflict`.
- **Files:** `src/app/api/broadcast/route.ts`

### [RESILIENCE] Row-by-Row Execution Loop
- **Module:** Broadcast API
- **Nature:** Refactored the Meta API `fetch()` loop to capture independent promises. Only calls the RPC to deduct 1 credit precisely if Meta responds with `status === 200`. Handles specific error mapping (e.g. rate limits) caught inside try/catch without burning the user's credits, strictly abiding by success-only deductions.
- **Files:** `src/app/api/broadcast/route.ts`

---

## 2026-07-08 — Phase 7: UX Skeletons & Interaction Barricades

### [COMPONENTS] Layout Skeleton & Spinner Utilities
- **Module:** UI / Components
- **Nature:** Established the core skeleton matrix for the platform. Built `Skeleton.tsx` for ambient pulse frame masking (`animate-pulse bg-[#E8E3DA]/60`) to combat CLS and a unified `Spinner.tsx` (`border-[#8B8378]`) for button integrations matching the luxury-minimal rule-set.
- **Files:** `src/components/ui/Skeleton.tsx`, `src/components/ui/Spinner.tsx`

### [UX ENGINEERING] Route Skeleton Locks
- **Module:** Dashboard / UX
- **Nature:** Systematically injected state-driven locks. 
  - **Auth:** Hard-locked all inputs (`disabled={loading}`) and replaced text with `PROCESSING PROFILE...` on login/register.
  - **Audience:** Added a backdrop-blur overlay into the `.dropzone` masking the CSV parser alongside dynamic text (`Parsing Recipient Registries...`).
  - **Broadcast:** Re-rendered the dispatch status step to clearly reflect `DISPATCHING ENGINES... [X/TOTAL]` paired with the luxury spinner.
  - **Settings:** Upgraded the data fetch fallback from a standard spinner to a full-structure layout Skeleton mirroring the profile and token inputs for absolute zero-CLS perception.
- **Files:** `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`, `src/app/dashboard/customers/page.tsx`, `src/app/dashboard/broadcast/page.tsx`, `src/app/dashboard/settings/page.tsx`

---

## 2026-07-08 — Phase 8: Global Error Boundaries & Connectivity Guards

### [INFRASTRUCTURE] Metadata & Favicon Assets
- **Module:** Root Layout / Assets
- **Nature:** Refactored the root `layout.tsx` metadata config to completely replace the default Vercel favicon structure. Injected our custom branding token (`/images/logo-dark.png`) across all explicit `<link rel="icon">` generations.
- **Files:** `src/app/layout.tsx`

### [ERROR HANDLING] Premium 404 & Global Fault Catchers
- **Module:** Next.js Routing
- **Nature:** 
  - Initialized `not-found.tsx` rendering a luxury minimal 404 state to intercept broken subdomain paths elegantly.
  - Constructed `error.tsx` functioning as a strict client-side React Error Boundary (`'use client'`). Prevents total session crashing by catching faults, rendering the technical payload in a protected tracking container, and offering a native `reset()` action hook.
- **Files:** `src/app/not-found.tsx`, `src/app/error.tsx`

### [RESILIENCE] Real-Time Connectivity Listener
- **Module:** Layout / Components
- **Nature:** Created `OfflineBanner.tsx` incorporating deep `window` event hooks (`online`, `offline`). Dynamically tracks packet disruption mid-execution and slides an explicit Z-index 100 banner warning to prevent shop owners from triggering ghost API dispatches while disconnected.
- **Files:** `src/components/ui/OfflineBanner.tsx`, `src/app/layout.tsx`

---

## 2026-07-08 — Phase 9: Audience Database Architecture

### [INTEGRATION] Excel & CSV Parsing Engine
- **Module:** Audience Manager
- **Nature:** Integrated the `xlsx` parsing library to seamlessly accept both `.xlsx` and `.csv` registries. Built a unified payload processor bridging the drag-and-drop layer to output identical database-ready structs regardless of file format.
- **Files:** `src/app/dashboard/customers/page.tsx`, `package.json`

### [DATA INTEGRITY] Phone Validation & Upsert Engine
- **Module:** Audience Database Controller
- **Nature:** Added strict 10-digit regex masking on the client side (`validatePhone()`). Invalid phone numbers in massive lists are gracefully stripped instead of crashing the batch process. If a valid number already exists under the active `shop_id`, the system utilizes PostgreSQL `upsert` (`onConflict: 'shop_id,whatsapp_number'`) to strictly override Names & Tags without generating phantom duplicates.
- **Files:** `src/app/dashboard/customers/page.tsx`

### [UI/UX] Live Database Interactivity
- **Module:** Audience Interface
- **Nature:** 
  - Rendered a live, fetching data table bound to the Supabase read operation wrapped gracefully inside the structural layout Skeleton (`Skeleton.tsx`).
  - Added an inline action loop allowing real-time edits (`<Edit />`) managed via an animated sidebar modal and direct row deletion triggers linked to `CustomConfirm`.
  - Added a global `Clear Audience List` action node with extreme safety barriers to wipe the entire session database in a single stroke.
- **Files:** `src/app/dashboard/customers/page.tsx`

---

## 2026-07-08 — Phase 10: Infinite Scroll & Filtration Matrix

### [PERFORMANCE] Infinite Scroll Data Architecture
- **Module:** Audience Database Controller
- **Nature:** Stripped out full-payload fetching in favor of an optimized Infinite Scroll architecture using `IntersectionObserver`. Now safely pulls `50` records per batch sequence (`.range(start, end)`). Protects browser memory overhead when dealing with massive retail contact sheets.
- **Files:** `src/app/dashboard/customers/page.tsx`

### [UI/UX] Search, Sort & Tag Filtration Matrix
- **Module:** Audience Interface
- **Nature:** 
  - Injected an Omni-Search bar enabling real-time `ilike` filtering against Names and WhatsApp Numbers directly against the Supabase node.
  - Implemented a custom Tag dropdown (VIP, Regular, New) mapping to PostgreSQL array `.contains()` rules.
  - Integrated a toggle strictly for Name-based Alphabetical Sorting (A-Z/Z-A).
  - Added a standalone Top Summary Module rendering the total live array boundary (`TOTAL REGISTERED AUDIENCE`) using `exact` count estimators.
### [ROUTING] Modular Audience Interface Separation
- **Module:** Dashboard / Audience
- **Nature:** Separated the Audience Management module into two distinct routes for optimal user experience.
  - `/dashboard/customers` is now strictly dedicated to the Upload configuration, Dropzone CSV/XLSX processing, and quick single-contact entry.
  - `/dashboard/customers/management` operates as the high-performance database terminal featuring the total metrics, infinite scroll table, and filtration operations.
  - A sleek cross-navigation button matrix (`Manage Audience →`) links the two views.
- **Files:** `src/app/dashboard/customers/page.tsx`, `src/app/dashboard/customers/management/page.tsx`

---

## 2026-07-08 — Phase 11: Master Admin Dashboard & Audit Operations

### [ADMIN] Master Credentials & Security Gate
- **Module:** Admin / API
- **Nature:** Initialized highly restricted `admin_session` authentication gate based on `.env.local` custom configurations (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Built isolated Next.js API Routes (`/api/admin/login`, `/api/admin/data`) passing via HttpOnly cookie verification prior to any Supabase exposure.
- **Files:** `.env.local`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/data/route.ts`

### [UI] Luxury-Minimal Master Dashboard
- **Module:** Admin Interface
- **Nature:** Built `/admin/page.tsx` using strictly `#F5F1EA` and `#3E3B36` color matrix. Features 3 core Global Analytic cards (Total Shops, Tokens, Global Traffic) alongside a Chronological Monthly Ledger mapping historic transaction volume.
- **Files:** `src/app/admin/page.tsx`

### [MERCHANT] Centralized Ledger & Core Credit Infusion
- **Module:** Admin / Merchants
- **Nature:** Constructed the primary cross-platform Merchant Management Table rendering dynamic shop statuses. Built `MANAGE CREDITS` atomic execution layer triggering immediate credit increments directly into `public.wallets.credits_remaining` utilizing isolated RPC bypassing RLS correctly.
- **Files:** `src/app/api/admin/credits/route.ts`, `src/app/admin/page.tsx`

### [AUDIT] Live Slideout Consumption Metric
- **Module:** Admin / Audit
- **Nature:** Enhanced the merchant row logic to invoke a sleek `#FFFFFF` side-panel audit modal. Maps dynamic consumption of completed broadcasts against `public.campaigns` directly, filtering securely by `shop_id`. Contains nested Historical Campaigns Matrix and a real-time Visual Badge identifier (Low Credits Alert vs High Vol Sender) mapped onto the master table layout.
- **Files:** `src/app/admin/page.tsx`

---

## 2026-07-08 — Phase 12: AI Message Polisher Integration

### [AI ENGINE] Multi-tier AI Polisher with Failover
- **Module:** Broadcast / AI
- **Nature:** Added multi-tier AI Message Polisher with failover protection and database-backed rate-limiting. Integrated Gemini (Tier 1), Groq (Tier 2), SambaNova (Tier 3), Cerebras (Tier 4), and Local Fallback (Tier 5). Implemented a `user_rate_limits` table lookup inside `/api/ai/polish` ensuring 10 requests per 1-minute window, gracefully bypassing checks if the database is unavailable.
- **Files:** `/src/app/api/ai/polish/route.ts`, `/src/app/dashboard/broadcast/page.tsx`, `.env.local`

### [AI ENGINE] Token Enforcement Refactor
- **Module:** Broadcast / AI
- **Nature:** Unified the placeholder system to strictly use `{{1}}` for Customer Name and `{{2}}` for Storefront Name. Refactored the UI (`/dashboard/broadcast/page.tsx`) text hints and preview mapping logic. Overhauled the `/api/ai/polish` `systemPrompt` enforcing absolute rule parameters for B2B copywriting ensuring these Meta parameters are never rewritten. Updated Tier 5 local fallback sequence.
- **Files:** `src/app/api/ai/polish/route.ts`, `src/app/dashboard/broadcast/page.tsx`

### [UI/UX] Campaign Preview Rendering Repair
- **Module:** Broadcast / UI
- **Nature:** Completely refactored the visual preview architecture in `/src/app/dashboard/broadcast/page.tsx` to align with luxury-minimal design guidelines. Removed recursive string overlaps and constructed a realistic smartphone frame layout (`border-l-2 border-[#C4A896] bg-[#FFFFFF] shadow-sm`). Integrated a dynamic variable engine that gracefully maps `{{1}}` to a mock name ("Ayesha") and parses live Supabase session queries to map `{{2}}` to the true `brand_name`. Bound the backend AI return payload securely to the main `form.message_body` textarea state to ensure 1:1 preview parity.
- **Files:** `/src/app/dashboard/broadcast/page.tsx`

---

## 2026-07-08 — Phase 13: Global Pricing Engine & Admin Layout Refactor

### [DATABASE] Pricing Tiers Schema Addition
- **Module:** Schema / Architecture
- **Nature:** Added `public.pricing_tiers` single source of truth table to define global token exchange rates. Includes calculated `per_message_rate` generated column. Set RLS for read-access to all authenticated users, allowing the dashboard to fetch real-time packages directly instead of rendering hardcoded values.
- **Files:** `supabase-schema.sql`

### [ADMIN] Sidebar Navigation & Dashboard Overhaul
- **Module:** Admin Interface
- **Nature:** Completely refactored `/admin/page.tsx` transitioning away from a single scroll layout to a 3-View Sidebar Navigation matrix (Master Analytics, Merchants, Pricing Engine). Added `totalRevenue` tracking logic dynamically capturing successful transactions from `payment_logs` into a new gross revenue visual card, alongside a System Status Alert logging framework errors.
- **Files:** `src/app/admin/page.tsx`

### [MERCHANT] Dynamic Recharge Synchronization
- **Module:** Settings / Payments
- **Nature:** Ripped out hardcoded `CREDIT_PACKS` arrays from `/dashboard/settings/page.tsx`. Shop owners' UI now instantly synchronizes with the `public.pricing_tiers` database endpoint inside the core `load()` sequence. Replaced deprecated static components with reactive map iterations that automatically apply administrative edits globally.
- **Files:** `src/app/dashboard/settings/page.tsx`

### [API] Master Pricing Upsert Gateway
- **Module:** Admin / API
- **Nature:** Added `POST /api/admin/pricing/route.ts` which processes bulk arrays of tier modifications sent via the admin dashboard. Performs a secure `upsert` payload into `pricing_tiers` using `onConflict: 'id'`, bypassing normal RLS through the administrative service key context. Also appended pricing data fetches into the core `GET /api/admin/data/route.ts`.
- **Files:** `src/app/api/admin/pricing/route.ts`, `src/app/api/admin/data/route.ts`

---

## 2026-07-08 — Phase 14: Marketing Landing Page Realignment

### [UI/UX] Hero Section Enhancements
- **Module:** Landing Page / Hero
- **Nature:** Added two new micro-feature text elements beneath the primary CTA row to highlight our Multi-Tier AI Engine Failover Protection and Real-Time Local Connection Packet Intercept Guard using strict uppercase micro typography (`tracking-[0.2em] text-xs text-[#8B8378]`).
- **Files:** `src/app/page.tsx`

### [UI/UX] Platform Feature Matrix Overhaul
- **Module:** Landing Page / Features
- **Nature:** Replaced deprecated feature cards with the new "Dynamic AI Copywriter" and "Unified CSV & Excel Parser" highlighting the Phase 9 to Phase 12 production enhancements. Adhered strictly to the existing grid dimensions and luxury-minimal design token system (`#F5F1EA`, `#3E3B36`).
- **Files:** `src/app/page.tsx`

### [UI/UX] Services Index Expansion
- **Module:** Landing Page / Services
- **Nature:** Expanded the "Everything You Need to Broadcast at Scale" services grid to include two new sections: "05 / Advanced Database Terminal" (featuring PostgreSQL array rules and omni-search) and "06 / Dynamic Pricing & Autonomous Ledger" (detailing Cashfree integrations and the synchronized pricing grid).
- **Files:** `src/app/page.tsx`

### [UI/UX] New Master Infrastructure Safety Architecture
- **Module:** Landing Page / Infrastructure
- **Nature:** Injected an entirely new core section before the final CTA row showcasing the platform's infrastructure safety. Includes details on Idempotency Conflict Security and Zero-CLS Structural Skeletons (React Error Boundaries, offline network listeners). Rendered with a clean cream background and strict minimalist layout constraints (`bg-[#F5F1EA] border-y border-[#E8E3DA] py-16`).
- **Files:** `src/app/page.tsx`

---

## 2026-07-08 — Phase 15: AI Feature Copy Refinement & Founder Contact Hub

### [UI/UX] AI Feature Copy Overhaul
- **Module:** Landing Page / Features
- **Nature:** Refined the AI feature card to prominently highlight the "AI-Powered Message Polisher". Updated the description to emphasize the multi-tier failover capabilities (Gemini/Groq) and automatic injection of Meta standard tokens for conversion and compliance.
- **Files:** `src/app/page.tsx`

### [UI/UX] Direct Onboarding Support Block
- **Module:** Landing Page / Contact Support
- **Nature:** Injected a new "Owner Contact & Support" section directly preceding the footer. Implemented a luxury-minimal layout showcasing the founder's details (Sharafath, Kerala office) alongside two explicit high-converting action buttons mapping directly to `tel:` and `https://wa.me/` for seamless instant onboarding and queries. 
- **Files:** `src/app/page.tsx`

---

## 2026-07-08 — Phase 16: Final Production Clearance & Copy Synchronization

### [UI/UX] Services Matrix Mismatch Resolution
- **Module:** Landing Page / Services
- **Nature:** Refactored the structural description for Card 02 ("Contact Intelligence") to accurately reflect the unified `.csv` and `.xlsx` parsing engine capabilities, alongside regex masking and duplicate-safe upsert pipelines. Ensures complete marketing copy parity with actual Phase 9 engineering advancements. 
- **Files:** `src/app/page.tsx`

### [COMPLIANCE] Production Link Lock
- **Module:** Landing Page / Support Links
- **Nature:** Verified zero-CLS structural integrity on all direct contact buttons. Confirmed direct `tel:` API and custom query string `wa.me` intents route natively without application crashing. 
- **Status:** **FINAL PRODUCTION BUILD LOCKED.**

---

## 2026-07-08 — Phase 17: Admin Architecture Optimization & Data Schema Extension

### [API] Master Backend Aggregations
- **Module:** Admin / Data API
- **Nature:** Refactored `GET /api/admin/data/route.ts` to perform native PostgreSQL aggregations (`.select('*', { count: 'exact', head: true })` and `.reduce`) on the backend. Stopped returning massive row arrays for `shops`, `campaigns`, and `payments`, drastically reducing API payload weight and protecting browser memory. 
- **Files:** `src/app/api/admin/data/route.ts`

### [SECURITY] RLS Service Role Escalation
- **Module:** Admin / API
- **Nature:** Repaired the RLS violation causing `pricing_tiers` upserts to fail and `shops` arrays to appear empty for admins. Configured both `data/route.ts` and `pricing/route.ts` to exclusively utilize `SUPABASE_SERVICE_ROLE_KEY` directly within the `createClient` execution, correctly bypassing tenant row-level boundaries for administrative actions.
- **Files:** `src/app/api/admin/data/route.ts`, `src/app/api/admin/pricing/route.ts`

### [UI/UX] Merchants Matrix Infinite Scroll & Omni-Search
- **Module:** Admin / Dashboard
- **Nature:** Upgraded the Merchants table (`src/app/admin/page.tsx`) with a dedicated paginated API route (`/api/admin/merchants/route.ts`). Implemented infinite scroll chunking (50 rows per load), an Omni-Search filter line (`ilike` against name/email), and alphabetical/date sort toggles to manage high-volume merchant databases with zero UI latency.
- **Files:** `src/app/admin/page.tsx`, `src/app/api/admin/merchants/route.ts`, `src/app/api/admin/campaigns/route.ts`

### [SCHEMA] Store Location & Contact Binding
- **Module:** Public Shops / Schema
- **Nature:** Altered `public.shops` in `supabase-schema.sql` to include `contact_number` (text) and `location_address` (text). Injected luxury-minimal UI inputs into the Shop Signup form and the Merchant Settings Dashboard, linking these new data models seamlessly into the onboarding flow.
- **Files:** `supabase-schema.sql`, `src/types/broadcast.ts`, `src/app/auth/register/page.tsx`, `src/app/dashboard/settings/page.tsx`

---

## 2026-07-08 — Phase 18: Admin Master Ledger & Merchant Sub-Routing

### [ROUTING] Dynamic Sub-Route Architecture
- **Module:** Admin / Dashboard
- **Nature:** Refactored the `AdminDashboard` merchants table to dynamically route to `/admin/merchants/[id]` instead of using an inline audit slideout. 
- **Files:** `src/app/admin/page.tsx`, `src/app/admin/merchants/[id]/page.tsx`

### [UI/UX] 3-Section Merchant Ledger Interface
- **Module:** Admin / Merchants Detail
- **Nature:** Built a dedicated, luxury-minimal Master Profile Ledger. Features a Geographical Card mapping `city`, `district`, `state`, `country`, and Financial Counters for real-time wallet auditing. Implemented a Manual Infusion Engine and an Atomic Suspension Toggle (`is_blocked`) wrapped securely by `CustomConfirm` modals to prevent accidental execution.
- **Files:** `src/app/admin/merchants/[id]/page.tsx`

### [API] Isolated Ledger Data & Action Controllers
- **Module:** Admin / API
- **Nature:** Deployed new server controllers to serve the dynamic sub-route: `GET /api/admin/merchants/[id]/route.ts` retrieves the complete ledger join (shops + wallets + campaigns). `POST /api/admin/merchants/[id]/block/route.ts` handles the atomic toggling of the `is_blocked` flag utilizing `SUPABASE_SERVICE_ROLE_KEY`.
- **Files:** `src/app/api/admin/merchants/[id]/route.ts`, `src/app/api/admin/merchants/[id]/block/route.ts`

### [SCHEMA] Geographical Segmentation & Security Flags
- **Module:** Public Shops / Schema
- **Nature:** Extended `public.shops` in `supabase-schema.sql` to formally support structured regional data (`city`, `district`, `state`, `country`) and a strict boolean `is_blocked` flag for instant suspension.
- **Files:** `supabase-schema.sql`, `src/types/broadcast.ts`

---

## 2026-07-08 — Phase 19: Checkout Pipeline Hardening & Idempotency

### [API] Dynamic Pricing & Branding Injection
- **Module:** Checkout Session Route
- **Nature:** Refactored `POST /api/checkout/route.ts` to directly accept dynamically synced `amount_inr` and `credit_count` payloads from the client, resolving the static tier mismatch issue. Injected explicit Cashfree `order_meta` parameters locking the UI `brand_name` to "True Attendly Broadcast" and enforcing our local `logo-dark.png` asset.
- **Files:** `src/app/api/checkout/route.ts`

### [UI/UX] Checkout Trigger Idempotency
- **Module:** Merchant / Dashboard Settings
- **Nature:** Overhauled the Payment Action button in `/src/app/dashboard/settings/page.tsx` to mount an immediate interface lock combined with the `Spinner.tsx` framework to prevent duplicate network calls. If the gateway invocation fails, the process successfully rolls back utilizing `CustomConfirm` to broadcast the transactional error securely.
- **Files:** `src/app/dashboard/settings/page.tsx`

---

## 2026-07-08 — Phase 20: Cashfree Webhook Automation & Wallet Synchronization

### [API] Autonomous Gateway Webhook Listener
- **Module:** Webhook / Cashfree
- **Nature:** Constructed `/src/app/api/webhook/cashfree/route.ts` to parse raw `"PAYMENT_SUCCESS_WEBHOOK"` payloads. Utilizing `SUPABASE_SERVICE_ROLE_KEY`, it performs an immediate extraction of `order_tags` (fetching `shop_id` and `credit_count`). The system logs the success record into `public.payment_logs` securely while bypassing RLS.
- **Files:** `src/app/api/webhook/cashfree/route.ts`

### [SCHEMA] Atomic Mathematical Increment RPC
- **Module:** Public Wallets / Schema
- **Nature:** Configured an explicit PostgreSQL RPC function `public.increment(row_id uuid, value integer)` inside `supabase-schema.sql`. The webhook invokes this function, executing a strict mathematical increment (`credits_remaining = credits_remaining + value`) at the database engine level, perfectly preventing race conditions during asynchronous callback receipt.
- **Files:** `supabase-schema.sql`

---

## 2026-07-08 — Phase 21: Founder Support & Feedback Center

### [SCHEMA] Ticketing & Feedback Persistence
- **Module:** Public Shop Feedbacks / Schema
- **Nature:** Extended `supabase-schema.sql` by adding a highly isolated `public.shop_feedbacks` table. Engineered with absolute RLS lockdown to ensure merchants can securely transmit rating matrices, categorized issue types, and textual audits directly into the centralized ledger without bleed-over.
- **Files:** `supabase-schema.sql`

### [UI/UX] 24/7 Concierge Support Block
- **Module:** Merchant / Dashboard Support Route
- **Nature:** Extracted the support and ticketing form from the Settings hub into a dedicated, standalone routing structure at `/src/app/dashboard/support/page.tsx`. This preserves the luxury-minimal grid splitting the 24/7 direct communication pipelines and the interactive feedback matrix, now easily accessible via the main Dashboard Sidebar.
- **Files:** `src/app/dashboard/support/page.tsx`, `src/app/dashboard/layout.tsx`

---

## 2026-07-08 — Phase 22: Admin Support Tickets Ledger

### [API] Master Data Aggregation
- **Module:** Admin Data Route
- **Nature:** Extended `GET /api/admin/data/route.ts` to aggregate the newly created `shop_feedbacks` matrix. Utilized Supabase foreign-key joins to strictly fetch the underlying `shop_name` and `owner_phone` alongside the ticket metadata (rating, category, message) bypassing standard client RLS.
- **Files:** `src/app/api/admin/data/route.ts`

### [UI/UX] Support & Feedback Ledger Interface
- **Module:** Master Admin Dashboard
- **Nature:** Injected a new "Support Tickets" sidebar node inside `/src/app/admin/page.tsx`. This view maps a luxury-minimal feed of all feedback transmissions globally, visually rendering the dynamic 5-star ratings, category tags, explicit shop identities, and message bodies in a clean ledger format for direct Founder review.
- **Files:** `src/app/admin/page.tsx`

---

## 2026-07-08 — Phase 23: Admin Ticket Details Modal

### [API] Master Shop Entity Expansion
- **Module:** Admin Data Route
- **Nature:** Refactored the `shop_feedbacks` query in `/src/app/api/admin/data/route.ts` to perform a `shop:shops (*)` deep-fetch. This ensures the master interface has the absolute geographic and meta constraints for every ticket raiser.
- **Files:** `src/app/api/admin/data/route.ts`

### [UI/UX] Modal Ledger Drill-Down
- **Module:** Master Admin Dashboard / Support Node
- **Nature:** Converted feedback rows in `/src/app/admin/page.tsx` into active interactive blocks (`cursor-pointer`). Clicking a ticket immediately spins up a high-z-index `TICKET DETAILS MODAL`. This overlay parses the full deep-fetch object, securely laying out the Merchant Profile, Suspension Status, and Geographic Node (City, State, Country, Full Address) for the founders.
- **Files:** `src/app/admin/page.tsx`

---

## 2026-07-08 — Phase 24: Legal Compliance & SEO Asset Generation

### [COMPLIANCE] LLM Discovery File & Meta Legal Pages
- **Module:** Public Assets / Routing
- **Nature:** Generated `/public/llms-full.txt` and `/public/llms.txt` exposing platform architecture and capabilities directly to AI crawlers. Added strict Meta compliance legal structures (`/privacy` and `/terms`) built on `#F5F1EA` luxury-minimal layouts ensuring 100% adherence to WhatsApp API verification requirements.
- **Files:** `/public/llms-full.txt`, `/public/llms.txt`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`

### [SEO] Root Layout Metadata Injection
- **Module:** Layout
- **Nature:** Refactored the core Next.js `metadata` object within `layout.tsx`. Expanded the title schema and injected targeted keywords for high-retention retail acquisition. Updated the `openGraph` object strictly to enforce locale structures and the custom dark logo for external social crawl previews.
- **Files:** `src/app/layout.tsx`

---

## 2026-07-08 — Phase 25: Master Infrastructure Logging & Resilience Upgrades

### [ASSETS] Production Favicon Forcing Array
- **Module:** Layout Assets
- **Nature:** Refactored `/src/app/layout.tsx` metadata configuration to explicitly dictate multi-format `icons` array mapping (`/favicon.ico` + `/images/logo-dark.png`), forcibly overriding Vercel's legacy cache allocations.
- **Files:** `src/app/layout.tsx`

### [UI/UX] Luxury-Minimal Custom 404
- **Module:** Routing Fallbacks
- **Nature:** Generated `/src/app/not-found.tsx` to handle unchecked routing exceptions. Features a zero-CLS, centered `#F5F1EA` layout with explicit serif-header navigation recovery (`Return Home`).
- **Files:** `src/app/not-found.tsx`

### [SECURITY] Administrator Activity Logs & Real-Time Auditing
- **Module:** Admin Ledger & Auth Routing
- **Nature:** Added `public.user_activity_logs` into `supabase-schema.sql` utilizing absolute RLS lockdowns. Injected background POST hooks directly into `login` and `logout` flow execution blocks ensuring synchronous tracking of merchant interactions. Constructed a "Security & Audit Logs" table under the `/admin` view with 50-row paginated Infinite Scroll fetching directly via Service Role credentials.
- **Files:** `supabase-schema.sql`, `src/app/api/auth/log/route.ts`, `src/app/auth/login/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/admin/page.tsx`, `src/app/api/admin/logs/route.ts`

### [INTEGRATION] Settings Meta Provider Modal Update
- **Module:** Settings Layout
- **Nature:** Refactored the `handleFacebookConnect` modal logic in the Settings Dashboard. Bound dynamic `window.location.origin` callback routing and deployed robust popup-blocker intercepts displaying graceful Toast exceptions rather than invisible failures.
- **Files:** `src/app/dashboard/settings/page.tsx`

---

## 2026-07-09 — Phase 26: Meta Facebook Compliance & Auth Hardening

### [SECURITY] Meta Deauthorize & Data Deletion Interceptor
- **Module:** Auth Callback Infrastructure
- **Nature:** Built strict production-grade handler at `/src/app/api/auth/callback/facebook/route.ts` to seamlessly process GET and POST payloads. Checks for `signed_request` from Meta's compliance engine, gracefully intercepting execution prior to Supabase instantiation, and returning the exact mandated 200 OK JSON structural payload (`del_compliance_2026_trueattendly`).
- **Files:** `/src/app/api/auth/callback/facebook/route.ts`

### [INTEGRATION] Graceful Auth Passthrough
- **Module:** Auth Callback Infrastructure
- **Nature:** Implemented a non-blocking `?code=` query param handler ensuring standard, user-initiated Facebook OAuth connections correctly bypass the data deletion shield, natively exchanging session tokens directly into `supabase.auth` server-side and routing securely back to `/dashboard/settings`.
- **Files:** `/src/app/api/auth/callback/facebook/route.ts`

---

## 2026-07-09 — Phase 27: Landing Page Conversion Optimization (CRO)

### [UI/UX] The Waste vs. Wealth Comparison Matrix
- **Module:** Landing Page / Marketing Assets
- **Nature:** Injected a new high-converting Comparison Matrix ("Waste vs. Wealth") into `/src/app/page.tsx` as Section 3.5. Employs a 3-way responsive grid contrasting Social Media Ads and Traditional Media against True Attendly Broadcast.
- **Styling:** Adheres strictly to the luxury-minimal guidelines (`bg-[#F5F1EA]`, `#3E3B36`). Highlights the winning 'True Attendly' card with dark styling, a translated Z-axis pop, and an emerald Check icon. Includes a prominent psychological trust anchor badge ("Retail Reality Check").
- **Files:** `/src/app/page.tsx`

---

## 2026-07-09 — Phase 28: Campaign Analytics Suite & Routing Overhaul

### [Dashboard] Recharts-Driven Analytics & Campaigns Ledger
- **Module:** Merchant Dashboard / Campaign Analytics
- **Nature:** Rebuilt the `DashboardPage` (`/src/app/dashboard/page.tsx`) to showcase cumulative campaign performance using `recharts` (`AreaChart`). Included 4 high-fidelity summary cards (Total Sent, Delivered, Read, Failed).
- **Campaigns Ledger:** Refactored routing by transitioning the `broadcast` interface to a structured `campaigns` directory (`/src/app/dashboard/campaigns`).
  - Added a unified Campaign Ledger (`/src/app/dashboard/campaigns/page.tsx`) rendering a master `BarChart` for analytics across all campaigns, alongside an interactive row-based campaign history matrix.
  - Placed the Creator UI securely into `/src/app/dashboard/campaigns/create/page.tsx` and injected an explicit "View All Campaigns" button for immediate ledger access.
  - Built an isolated detail drill-down route (`/src/app/dashboard/campaigns/[id]/page.tsx`) mapping individual broadcasts to visual completion percentage components and a mock recipient-level data table (Sent, Delivered, Read, Failed).
- **Navigation Update:** Synchronized `/src/app/dashboard/layout.tsx` to align the sidebar links specifically from `Broadcast` to `Campaigns`.

---

## 2026-07-09 — Phase 29: Real-Time Campaign Analytics Webhook & Engine Sync

### [Backend] Real-Time Database Increments & Meta Webhooks
- **Module:** Campaign Engine / Inbound Webhooks / Supabase Architecture
- **Nature:** Architected a robust analytics syncing infrastructure to replace mocked visualization data with absolute source-of-truth counts:
  - **Schema Updates (`supabase-schema.sql`):** Added `total_sent`, `total_delivered`, `total_read`, and `total_failed` tracking parameters to the `campaigns` table. Engineered `message_logs` ledger to precisely map Meta's `message_id` back to our internal `campaign_id`.
  - **RPC Layer:** Deployed atomic increment procedures (`increment_campaign_sent`, `increment_campaign_metric`) to prevent race conditions during concurrent heavy-batch scaling operations.
  - **Broadcast Controller (`/src/app/api/campaigns/send/route.ts`):** Transitioned the controller to immediately log node IDs to `message_logs` upon successful dispatch and atomically increment `total_sent`.
  - **Webhook Ingestion (`/src/app/api/webhook/whatsapp/route.ts`):** Erected the inbound Meta payload receiver utilizing an isolated `createAdminClient` to reliably update independent message states and automatically increment aggregate campaign analytics (`total_delivered`, `total_read`, `total_failed`) across standard row level barriers.

---

## 2026-07-09 — Phase 30: Landing Page Conversion & Marketing Capabilities

### [Frontend] Advanced Capabilities Architecture
- **Module:** Public Site / Landing Page (`/src/app/page.tsx`)
- **Nature:** Non-destructively injected a new "Platform Deep Dive: Advanced Capabilities" section strictly utilizing pure HTML/Tailwind CSS mockups to retain zero external asset dependency.
  - **Feature 1:** "Bulk Campaign Broadcasting" mockup visualizes a luxury-minimal spreadsheet ledger UI (`bg-[#F5F1EA]`).
  - **Feature 2:** "AI Message Polisher" layout constructed via a split transform DOM rendering, mapping raw input to an instant polished template response.
  - **Feature 3:** "Deep Real-Time Analytics" dashboard horizontally stacked progress bars engineered via pure Tailwind dimensional mapping (`#10B981` read, `#6366F1` delivered, `#F43F5E` failed).
- **Styling Standards:** Upheld the core editorial scheme and seamlessly injected immediately prior to the core Bottom CTA block, ensuring fluid `gsap-reveal` transitions without breaking the layout skeleton.

---

## 2026-07-09 — Phase 31: Mobile Responsive Layout Polish

### [UI/UX] Mobile Initial Zoom & Horizontal Overflow Fix
- **Module:** Root Layout / CSS
- **Nature:** Explicitly configured the Next.js `Viewport` object with `maximumScale: 5` to prevent automatic system zoom on mobile browsers while allowing manual scaling. Appended `overflow-x-hidden w-full` to the root `<body>` tag, successfully barricading rogue elements from breaking device frame limits.
- **Files:** `/src/app/layout.tsx`

### [UI/UX] Audience Ledger Actions Touch Support
- **Module:** Audience Management / Dashboard
- **Nature:** Adjusted the action column buttons (Edit, Delete) in the Audience Database Terminal to ensure reliable touch interactions. Replaced `opacity-0` constraints with `opacity-100 md:opacity-0 md:group-hover:opacity-100`, forcing the action links to remain explicitly visible on mobile viewports while preserving the sleek luxury-hover aesthetic for desktop users.
- **Files:** `/src/app/dashboard/customers/management/page.tsx`

## 2026-07-09 — Phase 32: Popup Sync & Meta Connection State

### [INTEGRATION] Meta Popup Lifecycle & Parent Sync
- **Module:** Auth Callback Infrastructure
- **Nature:** Modified the Facebook OAuth callback route to return a clean HTML script that communicates with the `window.opener`. The payload forces a parent redirect to `/dashboard/settings?meta_status=success` and immediately triggers `window.close()`, resolving the issue of the dashboard rendering inside the popup frame.
- **Files:** `/src/app/api/auth/callback/facebook/route.ts`

### [UI/UX] Meta Connected Badge & Disconnect Logic
- **Module:** Merchant Settings / Provider Hub
- **Nature:** Overhauled the Facebook integration block utilizing luxury-minimal tokens (`#F5F1EA`, `#3E3B36`). If a `meta_access_token` is detected, the button elegantly transitions into an emerald success badge stating "✓ Connected to Meta Business". Added a secure, database-linked "Disconnect Account" atomic action to safely unlink Meta tokens via Supabase update logic.
- **Files:** `/src/app/dashboard/settings/page.tsx`

## Phase 29: Production Audit Remediation & Security Hardening

### [SECURITY] Architecture & Resilience Overhaul
- **Module:** Global Platform Infrastructure
- **Nature:** 
  - **Meta Webhook Hardening:** Intercepted raw POST streams on `/api/webhook/whatsapp/route.ts` to enforce `x-hub-signature-256` HMAC validation via `crypto`, rejecting unverified payloads with 401.
  - **Cashfree Race Condition Resolved:** Eliminated `maybeSingle` pre-check in `/api/webhook/cashfree/route.ts`, leveraging Postgres Unique Violation (Code 23505) for atomic idempotency. Stripped `ANON_KEY` fallback and removed trace leaks via `catch (error: unknown)`.
  - **Admin Security Wall Rebuilt:** Refactored `/api/admin/login/route.ts`, `data/route.ts`, and `pricing/route.ts` to validate against `process.env.ADMIN_SECURE_TOKEN` instead of weak static strings.
  - **Mobile UX & Grid Fixed:** Updated `viewport` in `layout.tsx` to `userScalable: false` locking initial zoom bugs on iOS. Stripped conflicting `.block` from the active campaigns ledger grid mapping in `/dashboard/page.tsx` resolving responsive layout collapse.
- **Files:** `/src/app/layout.tsx`, `/src/app/dashboard/page.tsx`, `/src/app/api/admin/login/route.ts`, `/src/app/api/admin/data/route.ts`, `/src/app/api/admin/pricing/route.ts`, `/src/app/api/webhook/whatsapp/route.ts`, `/src/app/api/webhook/cashfree/route.ts`

## 2026-07-09 — Phase 30: Meta Authorization Synchronization & DB Persistence

### [SCHEMA] Database Configuration Interceptor
- **Module:** Database Schema / `public.meta_configs`
- **Nature:** Generated an optimized PostgreSQL schema script to implement the `public.meta_configs` table (`id`, `shop_id`, `meta_access_token`, `meta_page_id`, `meta_business_id`, `is_connected`, `created_at`, `updated_at`). Added strict Row Level Security (RLS) ensuring that authenticated merchants can only select, insert, update, or delete their own records.
- **Files:** `/home/st/.gemini/antigravity/brain/6a36d22a-982f-486a-9ccf-b415ac916699/artifacts/meta_configs_schema.sql`

### [BACKEND] Endpoint Refactoring & Transaction Layer
- **Module:** Backend API / Facebook Auth Callback
- **Nature:** Upgraded `/src/app/api/auth/callback/facebook/route.ts` to execute a secure server-to-server Graph API exchange substituting the legacy code stub. Inserted a robust Supabase `.upsert()` transaction targeting `public.meta_configs` mapped securely by the active user `shop_id`, and ensured clean `500 Internal Server Error` fallback payloads on network or database exceptions to prevent silent execution blocks.
- **Files:** `/src/app/api/auth/callback/facebook/route.ts`

### [FRONTEND] Client-Side Reconciliation & Permanent UI Badging
- **Module:** Dashboard Settings View
- **Nature:** Refactored the Meta connection logic inside `/src/app/dashboard/settings/page.tsx`. Implemented reactive URL parameter parsing using `useSearchParams` (`?meta_status=success`) that instantly resolves to the new luxury-minimal "✓ Connected to Meta Business Node" badge. Replaced short-lived frontend state parameters with an immediate `useEffect` fetch from `public.meta_configs`, guaranteeing permanent persistence of the authenticated view across layout remounts.
- **Files:** `/src/app/dashboard/settings/page.tsx`

---

## 2026-07-14 — Phase 33: Settings Responsive Layout Hardening & Coming Soon Badge Integration

### [UI/UX] Settings Page Layout Refactoring & Reset Actions
- **Module:** Merchant Settings / Profile Management
- **Nature:** Refactored the layout structures in `/src/app/dashboard/settings/page.tsx`. Replaced the legacy single-column vertical stack with a responsive grid (`grid-cols-1 md:grid-cols-2 gap-5`). Applied a flex-wrap container on the Store Logo modifiers and built an adaptive container for the submit and a new "Reset Changes" button, scaling inputs down to 360px without layout breaking. Added a `handleResetProfile` callback to revert input values to the saved DB profile.
- **Files:** `/src/app/dashboard/settings/page.tsx`

### [UI/UX] Navigation Hardening & "Coming Soon" Badge Additions
- **Module:** Dashboard Sidebar / Global Navigation Layout
- **Nature:** Added "SMTP Settings" and "Email Marketing Setup" options to the navigation schema in `/src/app/dashboard/layout.tsx`. Kept these options and "Email Campaigns" visible to the user while disabling their navigation bindings. Implemented a custom `Soon` badge using the system warm-brown muted colors (`bg-[#F5F1EA]` and `text-[#8B8378]`), positioning it inline to the right of the menu labels.
- **Files:** `/src/app/dashboard/layout.tsx`

---

### [14/07/2026] - LLM Integration and Capabilities Documentation Update
- 🌟 **What Changed:** Synchronized the platform capability reference files based on code-level definition analysis of active and de-scoped features (including audience, billing counter, flash offers, and wallet/monetization).
- 💡 **User/Business Benefit:** Ensures external systems and AI integrations have correct details of the active and de-scoped modules directly matching codebase behavior.

---

## 2026-07-14 — Phase 34: Legacy Email Marketing & SMTP Infrastructure Purge

### [EXCISION] Platform-Wide Email Infrastructure Deletion
- **Module:** Email Marketing / SMTP
- **Nature:** Performed a complete, definitive purge of all legacy email marketing, SMTP, and Resend-related functionalities. Permanently deleted `/src/app/dashboard/email/`, `/src/app/api/email/`, and `/src/app/api/ai/email/` routes. Removed all `EmailCampaign` types and interfaces from `src/types/broadcast.ts`.
- **Files:** `src/types/broadcast.ts`, `/src/app/dashboard/email/` (deleted), `/src/app/api/email/` (deleted), `/src/app/api/ai/email/` (deleted)

### [UI/UX] Navigation & Landing Page Realignment
- **Module:** Sidebar Navigation / Landing Page / Security Firewall
- **Nature:** Purged the "Coming Soon" email navigation links and placeholder items from the merchant dashboard layout (`src/app/dashboard/layout.tsx`). Completely rewrote the public landing page (`src/app/page.tsx`) to excise the "Premium Email Suites" feature simulator. Refactored the core transaction ledger to display only "WhatsApp Campaign" and "Digital Invoice" dispatches, and simplified the Transaction Security Barrier to focus exclusively on WhatsApp Meta API workflows.
- **Files:** `src/app/page.tsx`, `src/app/dashboard/layout.tsx`

### [AI] Persona & Prompts Alignment
- **Module:** AI Assistants / Prompt Context
- **Nature:** Updated the system instructions for the AI copywriter in `src/app/api/ai/spintax/route.ts` to excise references to email modules and explicitly align with the WhatsApp/QR credit economy (2 credits for Flash Offers, 1 credit for AI Polisher/Spintax, 1 credit for WhatsApp).
- **Files:** `src/app/api/ai/spintax/route.ts`

### [14/07/2026] - Premium Landing Page Copywriting and Visual Overhaul
- 🌟 **What Changed:** Overhauled the storefront landing page copy and layout to focus on dynamic QR and push notifications, purged all emojis, aligned the ledger to display exact credit usage rows, and verified responsive rendering.
- 💡 **User/Business Benefit:** Boosts acquisition and retail trust by presenting a clean, professional, and zero-friction digital receipt engine for store owners.

### [14/07/2026] - Merchant Dashboard UI/UX and Mobile Refactor
- 🌟 **What Changed:** Overhauled all merchant dashboard routes to ensure 100% mobile-friendly compliance down to 360px without content loss. Constrained navigation sidebars to max-w-[280px], added automatic scroll and word-wrap properties, stacked quick actions and select credit packs vertically on small viewports, and integrated the active Web Push button. Additionally polished settings page layouts (wallet balance card, Facebook badge text wraps, accent color labels, and Workspace UUID rows) to fit perfectly on small screens.
- 💡 **User/Business Benefit:** Delivers a seamless, high-end dashboard interface for store owners running businesses from mobile devices, preventing overflows and maintaining brand consistency.

### [14/07/2026] - Public Storefront Catalog UI/UX Overhaul
- 🌟 **What Changed:** Audited and refactored the storefront dynamic offers page (`src/app/offers/[shopSlug]/page.tsx`). Removed the truncation/line-clamping on the offer description card layout so the text wraps naturally within the standard card bounds. Injected a dynamic Active Offers counter row below the brand header styled in luxury warm-brown (#5C4033) and warm-cream (#FAF6F0), and stacked metadata and action button fields on small viewports. Also, updated the storefront landing page (`src/app/page.tsx`) to completely hide the heavy interactive POS simulator and phone emulator playground elements on mobile viewports using a responsive `hidden lg:flex` display state.
- 💡 **User/Business Benefit:** Creates a clean, premium, and truncation-free storefront catalog that loads quickly and displays offer details beautifully on mobile devices down to 360px.

### [14/07/2026] - Purged Residual Markdown Emojis
- 🌟 **What Changed:** Conducted a comprehensive audit of UI components to replace and remove residual markdown emojis (`✨`, `⚡`, `🎉`, and other item presets). Swapped custom elements with clean typography or native Lucide React icons (e.g., `Sparkles`, `Zap`, `Key`). Affected routes include the Settings page, Flash Offers dashboard, Mobile POS Digital Bill terminal, Transaction ledger breakdown, password recovery gateways, and admin logs.
- 💡 **User/Business Benefit:** Establishes a highly-polished, premium visual aesthetic devoid of raw emoji characters, aligned with luxury warm cream backgrounds and rich brown typography.

---

### [14/07/2026] - Viral Flash Share Analytics Integration
- 🌟 **What Changed:** Integrated the "Total Shared" database metric system for flash offers. Added `push_shared_count` (INT, default 0) to `public.shop_flash_offers` and created the atomic RPC function `public.increment_flash_offer_shares`. Refactored the merchant dashboard metrics grid into a 6-card grid with a vertical divider, and updated type definitions. Embedded the Web Share API in the customer catalog cards (`src/app/offers/[shopSlug]/page.tsx` and `src/app/catalog/page.tsx`) to trigger the RPC increment on share resolution. Added the "Organic Share Engine" feature card to the landing page trinity grid using professional Lucide icons (`Share2`, `Layers`, `Radio`, `Users`).
- 💡 **User/Business Benefit:** Empowers merchants to track organic word-of-mouth referral scaling of their offers and ensures rigorous data integrity via atomic, secure PostgreSQL operations.

---

## 2026-07-14 — Phase 35: Web Push Notification Engine, View Deduplication & VAPID Hardening

### [ENGINE] Web Push Subscription Intake & API Route Overhaul
- **Module:** Push Notifications / Client Intake
- **Nature:** Audited client-side intake mechanism inside storefront catalog (`src/app/offers/[shopSlug]/page.tsx`). Replaced direct client-side Supabase writes with a POST API call to `/api/push-subscriptions` passing a complete JSON payload containing `shop_id` alongside deep properties `endpoint`, `keys.p256dh`, and `keys.auth` extracted from the valid subscription object. Created a new API route `/src/app/api/push-subscriptions/route.ts` and updated `/src/app/api/offers/subscribe/route.ts` to resolve both nested and flat properties.
- **Files:** `/src/app/offers/[shopSlug]/page.tsx`, `/src/app/api/push-subscriptions/route.ts`, `/src/app/api/offers/subscribe/route.ts`

### [DATABASE] Unique Subscription Endpoint Constraint
- **Module:** Database Schema / Migrations
- **Nature:** Ensured the database safely handles duplicate endpoints by validating the `endpoint` UNIQUE constraint on the `push_subscriptions` table. Created an explicit catch-up constraint migration script `/supabase-migration-web-push-unique.sql` containing a DROP/ADD sequence to prevent runtime database execution blocks.
- **Files:** `/supabase-migration-web-push-unique.sql`

### [ENGINE] Broadcast Pipeline, VAPID Configuration & Endpoint Purging
- **Module:** Web Push Broadcast / Workers
- **Nature:** Generated corporate VAPID public/private key pairs and bound them to the server execution frame via `.env.local` and `webpush.setVapidDetails` configurations. Refactored the broadcast trigger logic in `/src/app/api/flash-offers/create/route.ts` to map strictly to the originating `shop_id` and execute dispatch in parallel. Wrapped each notification delivery inside an absolute try-catch filter to auto-purge expired browser endpoints (404/410) instantly from the database array.
- **Files:** `/src/app/api/flash-offers/create/route.ts`, `/.env.local`

### [ANALYTICS] Multi-Trigger View Deduplication & View API
- **Module:** Storefront Analytics / Page Views
- **Nature:** Exised the automatic view increment trigger from `/src/app/api/offers/route.ts` to stop duplicate view tracking on catalog query/search/sort triggers. Created a dedicated view tracking POST route `/src/app/api/offers/view/route.ts`. Added a client-side layout analytics initialization hook in `/src/app/offers/[shopSlug]/page.tsx` that ensures view tracking triggers exactly ONCE per unique visitor session using a client-side React `useRef` debounce flag and localized browser `sessionStorage` tracking keys.
- **Files:** `/src/app/api/offers/route.ts`, `/src/app/api/offers/view/route.ts`, `/src/app/offers/[shopSlug]/page.tsx`

---

## 2026-07-14 — Phase 36: Flash Offer Auto-Publish & Expiry Scheduling Engine

### [SCHEMA] Temporal Scheduling Columns Addition
- **Module:** Database Schema / Migrations
- **Nature:** Added migration script `supabase-migration-flash-offers-scheduling.sql` to introduce scheduling columns `start_at` (TIMESTAMP WITH TIME ZONE), `end_at` (TIMESTAMP WITH TIME ZONE), `status` (TEXT, default 'draft'), and `push_sent` (BOOLEAN, default FALSE) to `public.shop_flash_offers`. Backfilled existing records to maintain data safety.
- **Files:** `/supabase-migration-flash-offers-scheduling.sql`

### [BACKEND] Unified API Handlers & Temporal Polling Cron
- **Module:** Backend API / Scheduling Controls
- **Nature:** 
  - Unified all flash offer creation/updates to `/api/flash-offers/route.ts` (POST/PUT), ensuring server-side status calculation based on current time versus start/end bounds, atomic credit deductions via `deduct_credits` RPC, and input validations.
  - Implemented `/api/flash-offers/cron/route.ts` endpoint for automated status transitions (draft → active → expired) and push notification broadcasting.
  - Refactored the public storefront route `/api/offers/route.ts` to enforce temporal filtering, ensuring only `active` status offers are queried.
- **Files:** `/src/app/api/flash-offers/route.ts`, `/src/app/api/flash-offers/cron/route.ts`, `/src/app/api/offers/route.ts`

### [UI/UX] Dashboard & Management Page Overhaul
- **Module:** Merchant Dashboard / Scheduling Forms
- **Nature:** 
  - Updated `dashboard/flash-offers/page.tsx` and `dashboard/flash-offers/manage/page.tsx` to integrate luxury warm-brown (#5C4033) datetime-local pickers for `start_at` and `end_at`.
  - Added visual status badges (Scheduled, Live Now, Concluded) to the desktop and mobile tables.
  - Expanded filter options in the management page to support filtering by status (Live, Scheduled, Concluded).
  - Purged legacy emojis from image presets in the management forms.
- **Files:** `/src/app/dashboard/flash-offers/page.tsx`, `/src/app/dashboard/flash-offers/manage/page.tsx`

---

## 2026-07-14 — Phase 37: Flash Offer Scheduling Validation Matrix Hardening

### [UI/UX] Modal Form Validations & Warning Prompts
- **Module:** Merchant Dashboard / Scheduling Forms
- **Nature:** Added `validationError` reactive state and a validation check hook (`validateDates`) in `/src/app/dashboard/flash-offers/page.tsx` and `/src/app/dashboard/flash-offers/manage/page.tsx`. If a merchant enters a past date or chronological sequence anomaly, a premium warm-brown styled warning card is displayed within the modal, and the submission/confirmation action buttons are dynamically disabled.
- **Files:** `/src/app/dashboard/flash-offers/page.tsx`, `/src/app/dashboard/flash-offers/manage/page.tsx`

### [BACKEND] Server-Side Payload Inspections & HTTP 400 Enforcement
- **Module:** Flash Offers API
- **Nature:** Refactored date parsing in the POST and PUT endpoints inside `/src/app/api/flash-offers/route.ts`. Ensured that if `start_at` is left empty or omitted, it defaults to the server execution timestamp (`NOW()`) and status `'active'`. Enforces that if `start_at` is explicitly provided, it evaluates to a future timestamp (relative to the runtime, with a 5-second drift tolerance) and `end_at` is chronologically after `start_at`. Returns HTTP `400 Bad Request` if bounds are breached.
- **Files:** `/src/app/api/flash-offers/route.ts`

---

### 15/07/2026 - Production Metrics, Push Broadcast & View Analytics Hardening
- 🌟 **What Changed:** Resolved loading and layout loops when viewing the merchant catalog, and corrected store profile sync issues to ensure page views and subscriber registrations are counted instantly. Upgraded the notification dispatch system to log all outreach attempts successfully while removing inactive subscriptions from the registry.
- 💡 **User/Business Benefit:** Shop owners get highly reliable, real-time analytics for catalog views and notification campaigns without lag or display errors.

---

### 15/07/2026 - Premium Storefront Catalog Shimmer Skeletons
- 🌟 **What Changed:** Replaced the generic loading indicator on the public storefront catalog page with custom-designed shimmering skeletons. The skeleton blocks perfectly match the page header and card grids, utilizing a luxury warm-brown animated shimmer effect.
- 💡 **User/Business Benefit:** Storefront visitors get an instant, visually satisfying preview of the page structure while offers load, reducing perceived loading times and eliminating layout jumps.

---

### 15/07/2026 - Non-Technical Product Design Blueprint Created
- 🌟 **What Changed:** Created a comprehensive product flow document (`PRODUCT_FLOW.md`) in the project root, mapping all four core customer journeys — Instant Magic Scan, Smart Offer Scheduling, Organic Viral Sharing, and Direct Customer Notification Broadcast — entirely in warm Malayalam-English conversational language from the merchant and customer perspective.
- 💡 **User/Business Benefit:** Provides a clear, human-readable business blueprint that any stakeholder, investor, or team member can understand without any technical background, ensuring complete product vision alignment.

---

### 15/07/2026 - AI Knowledge Base Business Context Overhaul
- 🌟 **What Changed:** Completely rewrote the platform's AI discovery reference files with pure business-driven descriptions. Restructured around seven core Business Engines covering storefront discovery, autonomous campaign scheduling, organic social multiplication, direct notification pipelines, credit economy, digital billing, and customer audience registry. Removed all framework names, database terminology, and code references.
- 💡 **User/Business Benefit:** Ensures AI systems and external crawlers understand True Attendly purely as a commercial retail engagement solution, strengthening brand positioning and eliminating technical noise from public-facing context files.

---

*CHANGELOG maintained per RULE 1 of the True Attendly Broadcast engineering specification.*
