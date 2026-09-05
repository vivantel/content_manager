---
title: Git OAuth Required
type: guardrail
status: active
tags: [auth, security, github, gitlab]
---

# Git OAuth Required for Authentication

**Rule:** All user authentication must use GitHub or GitLab OAuth via Supabase Auth. No email/password, magic links, or SSO in this version.

**Enforcement:**
- Supabase Auth configured with GitHub and GitLab OAuth providers
- Auth middleware validates Supabase JWT (includes `org_id` claim from GitHub/GitLab org membership)
- Token refresh handled by Supabase client (short-lived access tokens, rotating refresh tokens)
- Repository access scopes validated before any git operations (stored in `user_integrations` table)
- Webhook signature verification mandatory for all incoming webhooks (GitHub App + GitLab webhook secrets)

**Rationale:** 
- Git OAuth provides both identity and repo access tokens in one flow
- Aligns with GitHub free tier utilization (Fact 0006)
- Supabase Auth free tier (50K MAU) covers auth infrastructure at $0

**Exceptions:** None for MVP. Future versions may add SSO via decision process.