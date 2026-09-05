---
title: Web Dashboard for Content Review
type: guardrail
status: active
tags: [product, review, dashboard, ui]
---

# Web Dashboard Required for Content Review

**Rule:** All content review, editing, approval, and scheduling must be possible through the web dashboard. No git-backed (PR) or CLI-only workflows for core review loop.

**Enforcement:**
- Dashboard implements: draft list, detail view with side-by-side source/editor, approve/request-changes/reject actions, schedule/publish controls
- Keyboard-accessible, responsive, works in modern browsers
- Real-time updates via WebSocket when drafts change state
- No "edit in GitHub" or "edit locally" as primary path

**Rationale:** Non-technical stakeholders (marketing, PMs, execs) must participate in review without git knowledge.

**Exceptions:** API exists for automation; CLI for power users — but dashboard is canonical.