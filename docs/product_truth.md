# Product Truth — FrontLoop

## 1. Product Definition
**FrontLoop** is a **B2B WhatsApp AI Lead & Business Agent** built specifically for Small and Medium Businesses (SMBs)—such as healthcare clinics, educational coaching institutes, salons, restaurants, and local service providers.

The platform provides an automated, always-on AI front desk over official WhatsApp channels that:
- Instantly acknowledges customer inquiries 24/7 with zero waiting time.
- Answers domain-specific questions about business services, doctor/trainer timings, course fees, and appointments using a tenant-specific Knowledge Base.
- Collects customer requirements, preferred slots, and contact details into a structured Lead pipeline.
- Automatically handles handoff to human staff when requested or when complex assistance is required.

---

## 2. Core Technical Architecture

The platform is strictly serverless, decoupled, and built on the modern web stack:

- **Application Framework**: Next.js (App Router, v16+) full-stack application.
- **Database & Persistence**: MongoDB via Mongoose (v9+), configured with pooled serverless connections and strict tenant isolation guards.
- **Messaging Engine**: Official Meta WhatsApp Cloud API (Graph API) for bidirectional message delivery, status callbacks, and business profile connectivity.
- **AI Processing Pipeline**: Multi-tier cascading LLM generation (Gemini 1.5 Flash $\to$ Groq LLaMA 3.3 70B $\to$ Cerebras LLaMA 3.3 70B $\to$ deterministic business fallback).
- **Background Execution**: Next.js native `after()` runtime execution paired with a scheduled self-healing sweeper cron (`/api/cron/reply-sweeper`).

---

## 3. Scope Boundaries & Deprecated Legacy Features

All legacy prototypes from previous iterations of the codebase have been **completely deprecated, purged, and ruled out of scope**. The system no longer supports, references, or builds:

- ❌ **Dead Stock Marketplace**: Cleared out; no peer-to-peer inventory clearing or buyer-seller marketplace features.
- ❌ **Flash Offers & Storefront Showcase**: Deprecated; no public dynamic flash deal links, flyer viewers, or temporary sales campaigns.
- ❌ **Digital POS Billing Counters**: Deprecated; no counter POS invoice generation, thermal print scripts, or digital PDF receipt download links.
- ❌ **Outbound Blast Campaigns / Spintax Anti-Ban**: Deprecated; no unsolicited mass broadcast blasts, Excel upload spam sequences, or artificial Spintax message scrambling.
- ❌ **Supabase & Prisma Dependencies**: Permanently removed; no PostgreSQL databases, Supabase RLS, Prisma engines, or external wrapper HTTP servers.

