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

*CHANGELOG maintained per RULE 1 of the True Attendly Broadcast engineering specification.*
