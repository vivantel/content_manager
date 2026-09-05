---
id: 0014
title: MVP Scope
type: decision
status: active
track: product
tags: [product, mvp, scope, roadmap]
---

# MVP Scope: Full Feature Set Within Free Tiers

**Context:** User wants full feature set, not incremental MVP, but must run at $0/month.

**Decision:** Build complete system in first release, constrained to SaaS free tiers:
- Centralized watcher (webhooks + GitHub Actions polling)
- AI generation with free LLM SaaS (GitHub Models → OpenRouter → NVIDIA NIM → Google AI Studio)
- Web dashboard with calendar, editor, review workflow
- Multi-channel publishing (blog, social, newsletter)
- Scheduling (auto + manual) with reminders
- Multi-channel notifications
- Multi-tenancy with org isolation (Supabase RLS)
- Prompt-based generation config
- Comprehensive analytics

**Hard Constraint (Guardrail: zero-infra-cost):**
- Must deploy and run within Vercel Free + Supabase Free + GitHub Actions Free
- No paid infrastructure at any layer
- Free tier quotas drive capacity limits (alert at 70% utilization)

**Rationale:**
- User explicitly requested full feature set
- Partial releases delay value delivery
- Architecture decisions (centralized, multi-tenant) require full stack
- Free tier constraint forces efficient architecture from Day 1

**Risk:** Longer time to first deploy; free tier quotas may limit scale. Mitigation: phased internal rollouts, feature flags, quota monitoring from Phase 0.