# AGENTS.md — Universal Repository Guidelines & Operational Invariants

This file defines the non-negotiable architectural invariants, security rules, and engineering guidelines for the FrontLoop codebase. Every agent and developer must comply with these standards without exception.

---

## 1. Product Truth & Scope
- **Domain**: FrontLoop is an autonomous **B2B WhatsApp AI Lead & Business Agent for SMBs** (clinics, institutes, salons, local businesses).
- **Architecture**: Next.js App Router (Full-Stack) + MongoDB (Mongoose) + Meta WhatsApp Cloud API.
- **Out of Scope / Deprecated**: Do NOT reintroduce dead-stock, flash offers, digital billing/thermal invoices, mass broadcast spam, or Spintax delay loops. Reference `docs/product_truth.md` for current boundaries.

---

## 2. Multi-Tenant Isolation (`tenantGuard`)
- **Strict Query Filtering**: Every query, mutation, and aggregation on tenant-owned models (`Lead`, `Message`, `KnowledgeBase`) MUST include `tenantId` in its filter.
- **Plugin Enforcement**: All tenant models use the `tenantGuard` plugin. Direct `findById(id)` will throw; callers must always execute `findOne({ _id, tenantId })` to prevent IDOR vulnerabilities.
- **Cross-Tenant Jobs**: Cross-tenant operational jobs (such as reply sweepers or billing reconciliation crons) MUST explicitly opt out using:
  ```ts
  Model.find(filter).setOptions({ crossTenant: true })
  ```
  Any query omitting `tenantId` without `{ crossTenant: true }` is a build and runtime violation.

---

## 3. Cryptographic Security & Authentication
- **Timing-Safe Checks**: All cryptographic signature checks (`x-hub-signature-256`, password verifications, secret tokens) MUST use constant-time comparison via `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
- **Password Hashing**: Passwords must be hashed using salted bcrypt (`bcryptjs`). Plaintext passwords must never touch logs or persistent storage.
- **Token Encryption**: Sensitive integration keys (e.g. WhatsApp access tokens) MUST be encrypted at rest using AES-256-GCM (`server/crypto.ts`).
- **Fail Closed**: Never use fallback defaults for secrets. Missing environment variables in `server/env.ts` must throw immediately during startup/first-access.

---

## 4. Serverless Full-Stack Conventions
- **Serverless Only**: Run exclusively on Next.js Route Handlers (`app/api/**/route.ts`) and Server Actions.
- **No External Servers**: Never introduce standalone Node.js server wrappers (Express, Fastify, Hapi, `server.js`).
- **Native Network Calls**: For external APIs (Meta Graph API, LLM providers), use native `fetch` with `AbortSignal.timeout(ms)`. Do not install external HTTP clients like `axios` or `got`.
- **Background Execution**: Use Next.js native `after()` for non-blocking post-response background work (AI processing, webhook dispatch) paired with scheduled cron sweepers.

---

## 5. Clean Code & Dead Weight Policy
- **Zero Dead Weight**: No unused variables, commented-out dead code blocks, or dangling `console.log` statements in production routes.
- **Type Safety**: Strictly preserve zero TypeScript warnings or errors. Always verify with `npx tsc --noEmit && npm run build`.

---

## 6. Git Hygiene & Documentation Sync
- **Changelog Maintenance**: Every functional change, feature addition, or migration must be appended to `docs/CHANGELOG.md` following standard [Keep a Changelog](https://keepachangelog.com/) conventions.
- **Discrete Commits**: Structure commits logically with clear conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`).

