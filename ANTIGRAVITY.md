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
