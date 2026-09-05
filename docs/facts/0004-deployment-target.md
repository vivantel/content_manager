---
id: 0004
title: Deployment Target
type: fact
status: active
tags: [architecture, deployment, infrastructure]
---

# Deployment Target

**Frontend:** Vercel Free (static + Edge Functions, 100GB bandwidth/mo)
**Backend:** Supabase Free (PostgreSQL 500MB, Auth 50K MAU, Storage 1GB, Edge Functions 2M invocations/mo, Realtime)
**Queue/Workers:** GitHub Actions Free (2,000 min/mo) + Supabase Edge Functions (cron, scheduled jobs)
**Database:** Supabase PostgreSQL (built-in connection pooling, RLS)
**Auth:** Supabase Auth with GitHub/GitLab OAuth providers
**Cache/Realtime:** Supabase Realtime (WebSocket) + in-memory caches
**File Storage:** Supabase Storage (1GB free)
**Container Registry:** GitHub Container Registry (free for public/private)
**DNS/SSL:** Vercel (automatic)
**Monitoring:** Vercel Analytics + Supabase Dashboard + GitHub Actions

**Zero VM Constraint:** No Railway, Render, Fly.io, AWS, GCP, Azure, DigitalOcean, or any VM-based hosting. All components must run within free tiers of Vercel, Supabase, GitHub.