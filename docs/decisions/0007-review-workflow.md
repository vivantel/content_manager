---
id: 0007
title: Review Workflow
type: decision
status: active
track: product
tags: [product, workflow, review, dashboard]
---

# Review Workflow: Web Dashboard

**Context:** Humans must review/edit AI drafts before publish.

**Decision:** Web-based dashboard as primary review interface:
- List view: all drafts with status (new, editing, approved, scheduled, published)
- Detail view: side-by-side git source + AI draft + editor
- Rich text editor (TipTap/ProseMirror) with Markdown support
- Inline comments/suggestions for team collaboration
- One-click approve, request changes, or reject
- Keyboard shortcuts for power users

**Rationale:**
- Accessible to non-technical stakeholders
- Real-time collaboration support
- Integrates with notification system (Decision 0009)
- Visual calendar integration (Decision 0012)

**Alternatives Considered:**
- Git-backed (PRs): rejected — friction for non-devs, no rich editing
- Email/Slack only: rejected — no persistent workspace
- CLI: rejected — not accessible to content/marketing teams