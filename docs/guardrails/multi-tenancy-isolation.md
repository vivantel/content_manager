---
title: Multi-Tenancy Isolation
type: guardrail
status: active
tags: [security, multi-tenancy, data-isolation]
---

# Multi-Tenancy Isolation

**Rule:** All data access must be scoped to the requesting user's organization(s). No cross-org queries, mutations, or aggregations permitted.

**Enforcement:**
- Every database table with org data has `org_id` column (not nullable)
- **Primary:** Supabase Row Level Security (RLS) policies on all tables — enforced at database level
- **Secondary:** Prisma middleware auto-appends `WHERE org_id = ?` for application-level defense in depth
- API layer validates user's org membership (via Supabase Auth JWT `org_id` claim) before any data access
- Integration tests verify isolation with multi-org test fixtures (attempt cross-org queries → expect zero rows)
- Audit log records all cross-org access attempts (should be zero)

**Violations:** Treated as critical security incidents. Block deploy on detection.

**Applies To:** All backend services, database migrations, API endpoints, background jobs, Edge Functions.

**Supabase RLS Policy Pattern:**
```sql
ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON content_pieces
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
```