---
id: 0015
title: CI Workflow Secret Conditionals
type: fact
status: active
tags: [architecture, ci, github-actions, phase0]
last-verified: 2026-09-05
---

# CI Workflow Secret Conditionals

**Pattern:** Use `if: ${{ secrets.SECRET_NAME != '' }}` for optional deployment steps.

**Implementation in `.github/workflows/ci.yml`:**
```yaml
- name: Deploy to Vercel Preview
  uses: amondnet/vercel-action@v25
  if: ${{ secrets.VERCEL_TOKEN != '' }}
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    # ...
```

**Applied to:**
- Vercel Preview deployment
- Vercel Production deployment
- Supabase Edge Functions deployment
- Slack notification

**Rationale:** Secrets may not be configured in all environments (forks, test runs). Conditional execution prevents workflow failures when secrets are missing while allowing deployments when configured.

**Commits:** 0b530c8, b8e3ea4, dd4bb88, 92231be, 2cffded (iterative fixes)