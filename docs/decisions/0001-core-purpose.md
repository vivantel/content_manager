---
id: 0001
title: Core Purpose
type: decision
status: active
track: product
tags: [product, strategy, core-loop]
---

# Core Purpose: Hybrid AI Drafts → Human Review → Publish

**Context:** We need a content management ecosystem that sits on top of git repos.

**Decision:** The system operates as a hybrid pipeline — AI generates drafts from git activity (commits, PRs, changelogs, tags), humans review/edit via web dashboard, then content is scheduled for auto-publish or manually published with reminders.

**Rationale:**
- Pure automation risks low-quality/incorrect content
- Pure manual doesn't scale with repo activity volume
- Hybrid captures value of both: AI speed + human judgment
- Git as source of truth ensures content reflects actual product changes

**Alternatives Considered:**
- Fully automated: rejected — quality risk
- Fully manual: rejected — doesn't scale
- AI-only with no review: rejected — brand risk

**Implications:**
- Requires web dashboard for review (Decision 0007)
- Requires scheduling with both modes (Decision 0008)
- Requires notification system for review/publish reminders (Decision 0009)