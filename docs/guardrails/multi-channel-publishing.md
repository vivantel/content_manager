---
title: Multi-Channel Publishing Required
type: guardrail
status: active
tags: [product, publishing, channels]
---

# Multi-Channel Publishing Required

**Rule:** The system must support publishing to at least three channel types: blog/website (Markdown/MDX), social media (Twitter/X, LinkedIn, Mastodon, Bluesky), and newsletter (HTML/text email). Custom webhooks count as a fourth.

**Enforcement:**
- Publisher abstraction with channel adapters — adding new channel = new adapter
- Each content piece specifies target channels at schedule time
- Publishing pipeline validates channel config before enqueue
- Failed publishes retry with exponential backoff; alert on persistent failure
- Channel-specific formatting handled in adapters (not core logic)

**Applies To:** Publishing service, dashboard scheduling UI, notification reminders.