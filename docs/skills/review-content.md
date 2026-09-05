---
title: Review and Approve Content
type: procedure
status: active
tags: [operations, review, workflow, dashboard]
---

# Review and Approve Content

**Purpose:** Human review of AI-generated drafts before publishing.

**Workflow States:** `draft` → `in_review` → `approved` / `changes_requested` / `rejected` → `scheduled` / `published`

**Steps:**

### 1. New Draft Notification
- Reviewer receives notification (per configured channels)
- Click link → opens dashboard draft detail view

### 2. Review Draft
**Detail View Shows:**
- Left panel: Git source (commits, PR diff, changelog excerpt, tag notes)
- Right panel: AI-generated draft in rich text editor
- Top bar: Content type, target platforms, repo, triggering event, generated at

**Actions:**
- **Edit directly:** Click to edit (Markdown/rich text), auto-saves
- **Comment:** Highlight text → add comment (threaded)
- **Request Changes:** Button → opens modal with required changes summary → notifies author
- **Approve:** Button → moves to `approved`, triggers scheduling flow
- **Reject:** Button → moves to `rejected`, optional reason → notifies author

### 3. Collaborative Review (Optional)
- Multiple reviewers can comment simultaneously
- @mentions notify team members
- "Resolve" checkbox on comment threads
- Version history: "Show AI original" / "Show previous edit"

### 4. Schedule or Publish
**If Approved:**
- Auto-opens schedule modal:
  - ☐ Publish now (manual)
  - ☑ Schedule for: [date/time picker] + timezone
  - Target channels: ☑ Blog ☑ Twitter ☐ LinkedIn ☑ Newsletter
  - Recurring: ☐ None ☐ Weekly ☐ Monthly (custom cron)
- Click "Schedule" → moves to `scheduled` state

**If Manual Publish:**
- Draft stays in `approved` state
- "Publish Now" button available anytime
- Daily reminder if >48h in `approved`

### 5. Post-Publish
- Status → `published` with timestamp + URLs per channel
- Analytics tracking begins
- Original git event linked in published piece metadata

**Done When:**
- Draft reaches `published` state with live URLs
- Or draft `rejected` with reason recorded
- All reviewer comments resolved or acknowledged

**Keyboard Shortcuts:** `a` approve, `r` request changes, `x` reject, `e` edit, `s` schedule, `p` publish now.