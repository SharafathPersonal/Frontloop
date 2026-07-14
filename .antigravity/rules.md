# ANTIGRAVITY SPECIFICATION
## True Attendly Broadcast — Absolute Technical Enforcement Rules

> These rules are **non-negotiable** and must be enforced on every pull request, code review, and deployment gate.

---

## RULE 1 — No Dead Weight

**Zero tolerance for code pollution in production builds.**

- No unused variable declarations permitted (`const x = ...` that is never read).
- No commented-out testing code blocks (e.g. `// console.log(data)`, `/* old impl */`).
- No dangling `console.log`, `console.warn`, or `console.error` statements in production paths — use structured warning patterns or remove entirely.
- ESLint `no-unused-vars` and `no-console` rules must be enforced in CI.
- Dead imports must be purged. If a module is imported but never referenced in JSX or logic, it must be removed.

---

## RULE 2 —-- Decoupled Isolation

**The entire workspace must remain strictly serverless and lightweight.**

- Architecture: **Next.js App Router** (v16+) + **Supabase Client SDK** only.
- No external Express, Fastify, Hapi, or any Node.js HTTP server wrappers are permitted.
- All server-side data operations must use **Next.js API Route Handlers** (`/app/api/*/route.ts`) or **Supabase Row-Level Security** enforced queries.
- No `server.js` or custom `server.ts` bootstrap files in the project root.
- No `next.config.ts` server-side customizations that introduce external runtime dependencies.
- Supabase Storage is the only permitted binary asset host (images, files). No self-hosted media servers.

---

## RULE 3 — Transactional State Safety

**Every client interaction that alters credit balances or customer lists must be hardened against race conditions and duplicate submissions.**

- **Optimistic UI Required:** Any mutation (credit deduction, customer insert, broadcast dispatch) must render an optimistic loading state immediately upon user action — before the async call resolves.
- **Idempotency Guards:** Dispatch buttons, save buttons, and upload triggers must be disabled (`disabled` attribute set) during in-flight requests. No double-submit paths permitted.
- **Rollback Handling:** If a server mutation fails, the UI must revert the optimistic state and surface a clear, user-readable error message.
- **Credit Operations:** All credit deductions must route through the `public.deduct_credits(shop_id, amount)` Supabase RPC function — never raw `UPDATE wallets SET credits_remaining = credits_remaining - n`. This prevents negative balance races.
- **Customer List Writes:** Bulk CSV ingestion to `public.customers_master` must batch in chunks ≤ 500 rows per Supabase insert call to avoid payload timeouts.

---

## ENFORCEMENT CHECKPOINTS

| Checkpoint | Method |
|---|---|
| Dead code scan | ESLint + TypeScript strict mode |
| Serverless compliance | Architecture review — no `server.js` in root |
| Optimistic UI audit | Manual QA on every credit/customer mutation |
| Credit deduction routing | Code grep: zero raw wallet UPDATEs outside RPC |
| Batch insert safety | Code review: customers bulk insert chunk validation |

---
## RULE 4 — Database Synchronization Transparency

**Absolute clarity on all backend schema alterations.**

- If any feature implementation or bug fix requires an alteration to the Supabase Database Structure, Row-Level Security (RLS) policies, or PostgreSQL Functions (RPC), the exact SQL migration code block MUST be explicitly provided and flagged in the response.
- Clear instructions on pasting the code into the Supabase SQL Editor must accompany the update to ensure zero drift between the codebase layers and the database environment.

*Last reviewed: 2026-07-08 · Maintained by: Core Systems*


[RULE: SUPABASE_SQL_EMISSION]
description = "Strictly emit manual Supabase SQL scripts for every DB schema or data change"
trigger_on = "Any modification to Prisma schema, database models, tags table logic, or contact source variables"

INSTRUCTION:
- You must be 100% responsible for keeping the remote Supabase DB in sync.
- For EVERY single code change that affects the database layer, you are REQUIRED to automatically generate a dedicated markdown block at the very end of your response labeled: "📋 SUPABASE SQL EDITOR SCRIPT".
- Inside this block, provide the exact, production-ready PostgreSQL queries (e.g., CREATE TABLE, ALTER TABLE, ADD COLUMN, INSERT INTO) needed for the update.
- The SQL must be fully concrete with explicit data types, foreign keys, and safe checks (e.g., IF NOT EXISTS) so that Sharafath can copy-paste and execute it instantly in the Supabase dashboard without manual coding or debugging.

# 🌌 ANTI-GRAVITY SYSTEM RULES

## [RULE 5] DIRECT REMOTE TENANT SCHEMA MUTATION & CACHE ISOLATION

### 🚨 CONTEXT & ENFORCEMENT
To prevent infrastructure sync failures or permission conflicts with global production supervisor frameworks, the AI tool must NEVER trigger global Supabase CLI environments or execution sequences (`supabase link`, `supabase db push`). All modifications must be executed at runtime through explicit, scoped backend connections or manual dashboard intervention pathways.

### 🛠️ MANDATORY EXECUTION GUIDELINES
1. **Local Key Reliance ONLY:**
   - Database schemas, custom types, or table alterations must strictly utilize the project's locally defined server variables: `process.env.SUPABASE_SERVICE_ROLE_KEY` and `process.env.NEXT_PUBLIC_SUPABASE_URL`.
2. **Automated Schema Reload Notification:**
   - Any script, migration route, or DDL execution that mutates live tenant tables must explicitly fire a cache reload instruction immediately following the query: `NOTIFY pgrst, 'reload schema';`
3. **Fallback Interactive Logging:**
   - If direct execution keys fail to perform automated table overrides, the system must output the raw SQL block for manual execution inside the remote Supabase Dashboard SQL Editor window.



   ## [RULE 6] STRICT MUTATION TRANSACTION LOCKS (വാലറ്റ് സുരക്ഷ)
- **Context:** AI must never update the database layers without using strict atomic operations when handling user wallets.
- **Rule:** Every balance deduction code generated for `wallet_balance` must execute inside an isolation transaction block or via a dedicated Postgres RPC function (`deduct_credits`). Never fetch the balance to the client side, subtract it via JavaScript, and push it back. This prevents balance duplicate leaks or hacking attempts.

## [RULE 7] OPTIMISTIC UI STATE HYDRATION (തത്സമയ മൊബൈൽ റെസ്‌പോൺസ്)
- **Context:** Merchants using mobile devices need fast confirmation when flipping active/inactive switches or uploading images.
- **Rule:** All merchant UI dynamic components (Toggles, Delete actions) must employ React/Next.js optimistic state updates or real-time cache revalidation (`router.refresh()` / server actions). The screen must instantly show the toggled state to the merchant before the database network request finishes, preventing layout freezing on mobile networks.

## [RULE 8] SANITIZED AI PROMPT GUARDRAILS (ടോക്കൺ പാഴാക്കൽ തടയൽ)
- **Context:** To secure our 1-credit AI Polish endpoint, the input payload must be clean.
- **Rule:** Before routing the merchant's input string to the LLM (Gemini/Groq), the server-side code must execute a character and safety truncation sequence. If the merchant inputs blank strings, malicious code, or excessively long text (>300 characters), intercept the request immediately at the API edge level. Return a 400 Bad Request *before* calling the AI, ensuring our system token resources are never wasted.

## [RULE 9] AUTOMATED NON-TECHNICAL CHANGELOG REGISTRY

### 🚨 CONTEXT & ENFORCEMENT
Every single time the AI environment applies a feature modification, design polish, database patch, or bug fix, the AI MUST automatically open, parse, and append the transaction history to the official log file without requiring explicit prompt instructions from the user.
👉 TARGET REGISTRY: .antigravity/changelog.md

### 📝 MANDATORY DATA STRUCTURE & FORMAT
The AI must strictly format the entry using the exact human-readable plain text structure below. Absolutely ZERO code snippets, zero file paths, and zero technical database syntax allowed.

Format Template to Append:
### [DD/MM/YYYY] - [Clear Feature Title / Summary Name]
- 🌟 **What Changed:** [Write a maximum 2-sentence explanation of what was visually or functionally adjusted in the app in simple plain language].
- 💡 **User/Business Benefit:** [Explain exactly how this change helps the shop owner save time, reduce friction, or boost sales].

### 🚫 ZERO-JARGON STRICT ENFORCEMENT
- Never use terms like: "API endpoints", "Supabase RPC", "state binding", "Tailwind classes", or "Prisma schemas".
- Convert technical actions into real-world business equivalents (e.g., Instead of "Updated table component to card sub-grids using md grid utilities", write "Optimized the display layout to look stunning and clear on compact smartphone screens").

---

### 🛡️ SUB-RULE: EDIT-MODE BILLING & SPAM PROTECTION
- **Context:** To prevent accidental double-charging of merchant wallet credits and safeguard customers from duplicate spam notifications during standard offer edits.
- **Rule:** When a merchant opens an existing Flash Offer in "Edit/Update Mode", the frontend "Broadcast via Web Push" toggle MUST strictly default to OFF, regardless of its state during the initial creation. 
- **Behavior:** The system must treat the toggle purely as an dynamic action trigger, never as a persistent database state. Saving an edit with the toggle OFF will execute a standard 0-credit metadata update. The merchant must explicitly and manually switch the toggle to ON if they intentionally wish to purchase and blast a fresh update broadcast for an additional 2 Wallet Credits.

---

### RULE 13: AUTONOMOUS AI KNOWLEDGE BASE & LLM SYNC MANDATE
- **The Requirement:** Whenever any new business capabilities, platform features, or operational modifications are introduced, updated, or refactored within the system, the corresponding description must be simultaneously injected into all AI context/memory files (including `public/llm.txt` and `llm-full.txt`).
- **Presentation Matrix:** The injected updates must adhere strictly to pure, high-value business terms and consumer experience flows, completely avoiding code blocks, database properties, or frameworks.
- **Verification Rule:** No feature pull request or development phase can be marked complete unless the model confirms that both the codebase and the LLM context files are perfectly synchronized.

---