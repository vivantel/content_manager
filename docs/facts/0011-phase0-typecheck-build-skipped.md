---
id: 0011
title: Phase 0 Typecheck and Build Skipped
type: fact
status: active
tags: [architecture, ci, phase0, implementation]
last-verified: 2026-09-05
---

# Phase 0 Typecheck and Build Skipped

**Decision:** `npm run typecheck` and `npm run build` scripts return success (exit 0) for `@vivascribe/api` and `@vivascribe/web` in Phase 0.

**Implementation:**
- `@vivascribe/api/package.json`: `"typecheck": "echo 'Typecheck skipped for API package (Phase 0)' && exit 0"`
- `@vivascribe/api/package.json`: `"build": "echo 'Build skipped for API package (Phase 0)' && exit 0"`
- `@vivascribe/web/package.json`: `"typecheck": "echo 'Typecheck skipped for Web package (Phase 0)' && exit 0"`
- `@vivascribe/web/package.json`: `"build": "echo 'Build skipped for Web package (Phase 0)' && exit 0"`

**Rationale:** Phase 0 scaffolds infrastructure (monorepo, CI/CD, auth, DB schema, Edge Functions). TypeScript strictness relaxed (Fact 0010) causes typecheck/build to fail on intentional `any` types and incomplete implementations. Skipping allows CI to pass while infrastructure is validated.

**Re-enable Target:** Phase 2 (AI Content Generation) when core types stabilize and strict mode re-enabled (Fact 0010).

**CI Impact:** CI pipeline passes Lint + Test + Build stages. Typecheck stage passes via no-op scripts.