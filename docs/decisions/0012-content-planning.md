---
id: 0012
title: Content Planning UI
type: decision
status: active
track: product
tags: [product, ui, planning, calendar]
---

# Content Planning: Visual Calendar

**Context:** Teams need to see content pipeline at a glance.

**Decision:** Visual calendar as primary planning view:
- Month/week/day views
- Color-coded by content type, status, platform
- Drag-drop to reschedule
- Click to view/edit draft
- Filter by repo, content type, platform, assignee
- Sync with external calendars (Google, Outlook) via ICS feed

**Rationale:**
- Calendar mental model fits publishing schedules
- Drag-drop is intuitive for rescheduling
- Visual density shows pipeline health
- ICS feed integrates with existing workflows

**Alternatives Considered:**
- Kanban: rejected — better for workflow states, worse for time-based scheduling
- Both: rejected — scope creep for MVP
- List: rejected — no temporal overview