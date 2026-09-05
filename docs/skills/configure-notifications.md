---
title: Configure Notifications
type: procedure
status: active
tags: [operations, notifications, channels, reminders]
---

# Configure Notifications

**Purpose:** Set up how and when team members get notified.

**Steps:**

### Organization Defaults (Admin)
1. Settings → Notifications → Organization Defaults
2. Enable/disable each channel:
   - Email: ☑ Draft ready ☑ Review requested ☑ Publish scheduled ☑ Publish failed
   - Slack: ☑ Draft ready ☑ Publish due ☐ Publish failed
   - Discord/Teams: ☐ (configure webhook URL)
   - In-app: ☑ All (always on)
   - Custom Webhook: ☐ (configure URL + events)
3. Set default reminder timing:
   - Scheduled: T-24h, T-1h
   - Manual: Daily after 48h idle
4. Save

### Per-Project Overrides (Project Admin)
1. Project Settings → Notifications
2. Override org defaults for this project's repos
3. Add project-specific channels (e.g., project Slack channel)

### Per-User Preferences (Each User)
1. Profile → Notifications
2. Toggle channels on/off per event type
3. Set quiet hours (no notifications 10pm–8am local)
4. Choose digest frequency: Instant / Hourly / Daily

### Slack/Discord/Teams Setup
1. In VivaScribe: Settings → Notifications → "Add Slack Workspace"
2. OAuth install VivaScribe Slack app
3. Select channels for each event type
4. Test: "Send Test Message"

**Done When:**
- Test notification received in each configured channel
- User preferences saved
- Reminder schedule active (verify in dashboard → "Upcoming Reminders")

**Notes:** Notification templates editable in Settings → Notification Templates (Markdown + variables).