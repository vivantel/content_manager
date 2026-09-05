---
id: 0009
title: Notifications
type: decision
status: active
track: product
tags: [product, notifications, channels, reminders]
---

# Notifications: Multi-Channel Configurable

**Context:** Teams use different communication tools.

**Decision:** Support all channels, configurable per user and per project:
- **Email:** Draft ready, review requested, publish scheduled/overdue, publish failed
- **Slack/Discord/Teams:** Webhook to team channels for draft ready, publish due
- **In-app:** Dashboard notification center + real-time toast
- **Custom webhooks:** For internal tools, PagerDuty, etc.

**Rationale:**
- Devs prefer Slack; PMs prefer email; execs prefer digest
- Per-user preferences reduce noise
- Webhooks enable custom workflows

**Implementation:** Notification service with channel adapters; user preference UI in dashboard; project-level defaults with user overrides.