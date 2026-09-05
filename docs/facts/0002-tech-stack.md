---
id: 0002
title: Tech Stack
type: fact
status: active
tags: [architecture, backend, database]
---

# Tech Stack

**Backend:** TypeScript/Node.js 20+ (LTS)
**Runtime:** Node.js 20+ on Vercel Edge Functions + Supabase Edge Functions
**API:** REST + Server-Sent Events (SSE) for real-time (simpler than WebSockets for horizontal scaling)
**Database:** PostgreSQL via Supabase (500MB free tier)
**ORM:** Prisma (with Supabase connection pooling)
**Auth:** Supabase Auth (GitHub/GitLab OAuth providers, 50K MAU free)
**Queue/Workers:** GitHub Actions (2,000 min/mo free) for polling/heavy jobs; Supabase Edge Functions (2M invocations/mo free) for scheduled tasks
**Cache/Realtime:** Supabase Realtime + in-memory (no separate Redis)
**File Storage:** Supabase Storage (1GB free)
**LLM Providers:** GitHub Models → OpenRouter free → NVIDIA NIM free → Google AI Studio free (Fact 0008)
**Observability:** Vercel Analytics + Supabase Logs + GitHub Actions insights