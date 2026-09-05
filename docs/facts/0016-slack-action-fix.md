---
id: 0016
title: Slack GitHub Action Input Fix
type: fact
status: active
tags: [architecture, ci, github-actions, slack]
last-verified: 2026-09-05
---

# Slack GitHub Action Input Fix

**Issue:** `slackapi/slack-github-action@v1.24.0` requires `payload` as input, not `webhook-url` as separate input.

**Before (broken):**
```yaml
- name: Send notification
  uses: slackapi/slack-github-action@v1.24.0
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  with:
    payload: |
      { ... }
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**After (fixed):**
```yaml
- name: Send notification
  uses: slackapi/slack-github-action@v1.24.0
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  with:
    payload: |
      { ... }
```

**Commit:** c7a9125

**Rationale:** The action reads webhook URL from `SLACK_WEBHOOK_URL` env var. The `webhook-url` input doesn't exist in v1.24.0.