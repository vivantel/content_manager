---
title: Scheduled and Manual Publish with Reminders
type: guardrail
status: active
tags: [product, scheduling, publishing, reminders]
---

# Scheduled and Manual Publish with Reminders

**Rule:** Every content piece must support both scheduled auto-publish and manual publish modes. Reminders must fire for both: T-24h and T-1h before scheduled; daily nudge for manual drafts older than 48h.

**Enforcement:**
- Scheduler service enqueues BullMQ delayed jobs for scheduled publishes
- Manual drafts tracked with `created_at`; reminder job scans daily
- Notification service sends via user's configured channels (Guardrail: Multi-Channel Notifications)
- Dashboard shows next reminder time for each draft

**Applies To:** Scheduling UI, scheduler service, notification service.