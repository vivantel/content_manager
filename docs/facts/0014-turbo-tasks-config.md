---
id: 0014
title: TurboRepo Tasks Configuration
type: fact
status: active
tags: [architecture, turbo, monorepo, ci]
last-verified: 2026-09-05
---

# TurboRepo Tasks Configuration

**Change:** `turbo.json` uses `tasks` instead of deprecated `pipeline`.

**Before (deprecated):**
```json
{ "pipeline": { "build": { ... }, "lint": { ... }, ... } }
```

**After (current):**
```json
{ "tasks": { "build": { ... }, "lint": { ... }, ... } }
```

**Commit:** 50e867b

**Rationale:** TurboRepo v2 deprecated `pipeline` in favor of `tasks`. The old key still works but shows deprecation warnings.