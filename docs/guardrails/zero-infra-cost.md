---
title: Zero Infrastructure Cost via SaaS Free Tiers
type: guardrail
status: active
tags: [architecture, cost, saas, constraints, deployment]
---

# Zero Infrastructure Cost via SaaS Free Tiers

**Rule:** The system MUST run entirely within SaaS free tiers. No VM instances, no paid infrastructure, no managed services beyond free tier limits.

**Enforced Free Tier Stack:**
- **Compute (Frontend):** Vercel Free (100GB bandwidth, unlimited personal projects)
- **Compute (Backend):** Supabase Free (500MB DB, 1GB file storage, 2M edge function invocations, Auth included)
- **Database:** Supabase PostgreSQL (500MB) + built-in Redis via Supabase Realtime/Edge Functions
- **Authentication:** Supabase Auth (GitHub/GitLab OAuth providers, 50K MAU free)
- **Queue/Workers:** GitHub Actions (2,000 min/mo free) + Supabase Edge Functions for scheduled jobs
- **LLM Inference:** GitHub Models (free) → OpenRouter free tier → NVIDIA NIM free tier
- **Container Registry:** GitHub Container Registry (free for public, 500MB private)
- **DNS/SSL:** Vercel (included)
- **Monitoring:** Vercel Analytics + Supabase Logs + GitHub Actions insights

**Hard Constraints:**
- ❌ No Railway, Render, Fly.io, AWS, GCP, Azure, DigitalOcean VMs
- ❌ No paid database plans (Neon, PlanetScale, etc.)
- ❌ No paid Redis (Upstash, Redis Cloud)
- ❌ No paid queue services (Trigger.dev, Inngest paid tiers)
- ❌ No self-hosted anything requiring VM

**Capacity Planning:**
- Monitor all free tier quotas in dashboard (Phase 7)
- Alert at 70% utilization of any quota
- Graceful degradation: reduce poll frequency, batch generations, delay non-critical jobs
- Document "upgrade triggers" for each quota (when to pay or optimize)

**Verification:** CI/CD fails if any config references non-free-tier resources.