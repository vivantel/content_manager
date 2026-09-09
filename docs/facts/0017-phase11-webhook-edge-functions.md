---
id: 0017
title: Phase 1.1 GitHub/GitLab Webhook Edge Functions
type: fact
status: active
tags: [architecture, phase1, edge-functions, webhooks, github, gitlab]
last-verified: 2026-09-05
---

# Phase 1.1 GitHub/GitLab Webhook Edge Functions

**Implemented:** Three Supabase Edge Functions in `apps/api/supabase/functions/`:

1. **`webhook-github`** — GitHub webhook receiver
   - HMAC SHA-256 signature verification (`x-hub-signature-256`)
   - Handles: `push`, `pull_request` (closed+merged), `release`, `create` (tag)
   - Stores raw payload in `webhook_events` table
   - Filters by repo's configured `event_sources`
   - Creates `repo_events` records with enrichment

2. **`webhook-gitlab`** — GitLab webhook receiver
   - Token-based verification (`x-gitlab-token`)
   - Handles: `push`, `merge_request`, `tag_push`, `release`
   - Same storage and processing pattern as GitHub

3. **`ingest-poll`** — GitHub Actions polling endpoint
   - Auth via `VIVASCRIBE_WEBHOOK_SECRET` Bearer token
   - Accepts `repositoryIds[]` and `since` timestamp
   - Per-repo polling with deduplication via `repo_sync_state`
   - Designed for public cover repo (`vivantel/git-poller`)

**Database:** Added `RepoSyncState` model (Prisma) for sync tracking.

**Shared Types:** Added `RepoSyncStateSchema` (Zod).

**Commit:** 5101f25 on branch `phase-1-git-watcher`

**Next:** Phase 1.3 (public cover repo), Phase 1.4 (enrichment + generation queue)