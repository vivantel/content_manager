---
id: 0004
title: Git Integration Architecture
type: decision
status: active
track: process
tags: [architecture, git, integration, watcher]
---

# Git Integration: Centralized Watcher Service

**Context:** System must monitor multiple repos across organizations.

**Decision:** Single centralized service watches all connected repos via:
- GitHub/GitLab webhooks (preferred, real-time)
- Scheduled polling via GitHub Actions (fallback, free tier)
- GitHub App for authenticated API access with higher rate limits

**Rationale:**
- Simpler operations: one service to deploy/monitor
- Easier cross-repo analytics and deduplication
- Centralized auth token management
- Better free tier utilization (Decision 0006 fact)

**Alternatives Considered:**
- Per-repo agents: rejected — ops overhead, duplicate infra
- CI/CD triggers only: rejected — not all repos use same CI
- CLI-only: rejected — no automation

**Dependencies:**
- Requires Git OAuth (Fact 0005)
- Requires configurable event sources (Decision 0005)