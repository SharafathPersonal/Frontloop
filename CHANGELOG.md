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

*CHANGELOG maintained per RULE 1 of the True Attendly Broadcast engineering specification.*
