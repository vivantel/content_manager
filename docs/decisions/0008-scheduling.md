---
id: 0008
title: Scheduling and Publishing
type: decision
status: active
track: product
tags: [product, scheduling, publishing, automation]
---

# Scheduling: Both Scheduled Auto-Publish + Manual with Reminders

**Context:** Teams need flexibility in when/how content goes live.

**Decision:** Support both modes per content piece:
- **Scheduled auto-publish:** Set date/time, system publishes automatically
- **Manual publish:** Human clicks "Publish Now" when ready
- **Reminders:** Notifications at T-24h, T-1h, T-overdue for scheduled; daily nudge for manual
- **Recurring schedules:** Weekly digest, monthly roundup (configurable cron)

**Rationale:**
- Launch announcements need exact timing (scheduled)
- Thought leadership pieces need polish time (manual)
- Reminders prevent forgotten content
- Recurring handles regular cadence content

**Implementation:** BullMQ delayed jobs for scheduled; dashboard "Publish Now" button for manual; notification service handles reminders.