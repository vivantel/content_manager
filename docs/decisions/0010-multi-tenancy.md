---
id: 0010
title: Multi-Tenancy
type: decision
status: active
track: process
tags: [architecture, multi-tenancy, isolation, security]
---

# Multi-Tenancy: Org Isolation

**Context:** System serves multiple organizations.

**Decision:** Full multi-tenancy with strict organization-level data isolation:
- Each org has own repos, users, content, prompts, schedules, analytics
- No cross-org data access (enforced at DB row level via org_id)
- Org settings: branding, default prompts, publishing channels, notification defaults
- Users belong to one or more orgs (via GitHub/GitLab org membership)
- Super-admin role for platform operators only

**Rationale:**
- SaaS model requires isolation
- Enterprise customers demand it
- GitHub/GitLab org membership maps naturally

**Guardrail:** Multi-tenancy isolation is non-negotiable (see guardrail).