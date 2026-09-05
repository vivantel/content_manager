# VivaScribe Implementation Plan

**Project:** VivaScribe — Content management ecosystem on top of git repos
**Status:** Planning
**Created:** 2026-09-05
**Target:** Full feature set within SaaS free tiers (Decision 0014, Guardrail: zero-infra-cost)

---

## Legend
- `[ ]` Pending
- `[~]` In Progress
- `[x]` Done
- `[!]` Blocked

---

## Phase 0: Foundation & Infrastructure (Free Tier Stack)

### 0.1 Project Setup (AI-Driven Development)
- `[ ]` Initialize monorepo (TurboRepo) with `apps/api`, `apps/web`, `packages/shared`
- `[ ]` Configure TypeScript, ESLint, Prettier, Husky
- `[ ]` **AI Dev Setup:** Cursor rules (`.cursorrules`), GitHub Copilot instructions, Kilo config
- `[ ]` **AI Dev Workflow:** PR template with AI review checklist, conventional commits enforced
- `[ ]` **CI/CD on Public Cover Repo:** Mirror push to public cover repo (e.g., `vivantel/git-poller`); GitHub Actions there runs lint, typecheck, test, build — unlimited minutes for public repos
- `[ ]` Private repo: only deploys (Vercel, Supabase) — minimal Actions usage

**Done When:** `npm run dev` starts API + Web locally; `npm run test` passes; AI tools configured; CI passes on cover repo.

### 0.2 Supabase Setup (Backend Platform)
- `[ ]` Create Supabase project (free tier)
- `[ ]` Enable GitHub + GitLab OAuth providers in Supabase Auth
- `[ ]` Configure JWT custom claims: `org_id` from GitHub/GitLab org membership
- `[ ]` Run Prisma migrations against Supabase PostgreSQL
- `[ ]` Enable Row Level Security (RLS) on all tables with `org_id` policies
- `[ ]` Enable Supabase Realtime for live updates (replaces WebSocket server)
- `[ ]` Configure Supabase Storage bucket for assets (1GB free)
- `[ ]` Set up Supabase Edge Functions for scheduled jobs (cron)
- `[ ]` Configure connection pooling (Supabase PgBouncer)

**Done When:** Supabase project linked; Auth works; RLS policies active; Edge Functions deployable.

### 0.3 Database Schema (Prisma + Supabase RLS)
- `[ ]` Organizations, Users, Memberships (synced from GitHub/GitLab orgs via webhook)
- `[ ]` Repositories, RepoEventSources, RepoPromptOverrides
- `[ ]` ContentPieces (drafts), ContentVersions, ContentReviews
- `[ ]` PublishingChannels, ChannelConfigs, PublishJobs
- `[ ]` Notifications, NotificationPreferences, ReminderJobs
- `[ ]` AnalyticsEvents, PromptVersions
- `[ ]` UserIntegrations (GitHub/GitLab tokens, scopes)
- `[ ]` FreeTierQuotas (track Vercel, Supabase, GitHub, OpenRouter, NVIDIA usage)
- `[ ]` Run migration; seed dev data; verify RLS blocks cross-org access

**Done When:** `npx prisma migrate dev` succeeds; RLS test passes; Supabase Studio shows all tables.

### 0.4 Authentication (Supabase Auth + Git OAuth)
- `[ ]` Supabase Auth client setup (web + API)
- `[ ]` GitHub OAuth App + GitLab OAuth App configured in Supabase
- `[ ]` Org membership sync: on login, fetch GitHub/GitLab orgs → upsert memberships
- `[ ]` JWT custom claim `org_id` injected via Supabase Auth hook
- `[ ]` Middleware: validate Supabase JWT, extract `org_id`, scope all queries
- `[ ]` Token storage: GitHub/GitLab installation tokens in `user_integrations` (encrypted)

**Done When:** Login with GitHub/GitLab works; user sees only their orgs; API rejects cross-org access.

---

## Phase 1: Git Watcher & Event Ingestion (GitHub Actions + Webhooks)

### 1.1 GitHub App & Webhooks
- `[ ]` Create GitHub App manifest (permissions: metadata, contents, issues, pull_requests, hooks)
- `[ ]` Webhook endpoint: `POST /api/webhooks/github` (Supabase Edge Function) with signature verification
- `[ ]` Handle events: `push`, `pull_request` (closed+merged), `release`, `create` (tag)
- `[ ]` Store raw webhook payloads in `webhook_events` table for debugging/replay
- `[ ]` GitHub App installation token exchange for API calls (5,000 req/hr vs 60)

**Done When:** Webhook receives test payload from GitHub; signature verified; event stored.

### 1.2 GitLab Webhooks
- `[ ]` GitLab OAuth App + webhook endpoint `POST /api/webhooks/gitlab` (Edge Function)
- `[ ]` Handle: push, merge_request, tag_push, release
- `[ ]` Same payload storage pattern

**Done When:** GitLab webhook works equivalently.

### 1.3 GitHub Actions Polling (Free Tier Fallback via Public Cover Repo)
- `[ ]` Create public GitHub repo (e.g., `vivantel/git-poller`) as cover — no VivaScribe code/logic
- `[ ]` Add reusable workflow `.github/workflows/git-poll.yml` (generic: "poll repos and notify webhook")
- `[ ]` Store secrets in cover repo: `VIVASCRIBE_API_URL`, `VIVASCRIBE_WEBHOOK_SECRET`
- `[ ]` Workflow calls Supabase Edge Function `/api/ingest/poll` with installation token
- `[ ]` Edge Function: fetches recent commits/PRs/tags since last run per repo
- `[ ]` Schedule: every 15 min (configurable per repo)
- `[ ]` Deduplication: track last processed SHA/tag per repo in `repo_sync_state` table
- `[ ]` API validates webhook signature + GitHub Actions IP ranges

**Done When:** Workflow runs on schedule in public repo; Edge Function ingests events; no duplicates; no VivaScribe traces in public Actions logs.

### 1.4 Event Processing Pipeline
- `[ ]` GitHub Actions job queue: `event-processing` (runs in Actions, not persistent worker)
- `[ ]` Normalize GitHub/GitLab payloads → internal `RepoEvent` type
- `[ ]` Filter by repo's configured event sources (Decision 0005)
- `[ ]` Enrich: fetch full PR diff, commit messages, changelog content via GitHub API
- `[ ]` Emit `RepoEventProcessed` → insert `ContentPiece` in `draft` status (or queue generation)

**Done When:** Webhook → Actions job → normalized event → draft created; visible in dashboard "Event Log".

---

## Phase 2: AI Content Generation (Free LLM SaaS)

### 2.1 Prompt Management
- `[ ]` CRUD API for PromptVersions (system, content-type, repo-override) in Supabase
- `[ ]` Dashboard: Prompt Library UI (Decision 0011, Procedure: configure-prompts)
- `[ ]` Variable interpolation: `{{commits}}`, `{{prs}}`, `{{tags}}`, `{{changelog}}`, `{{repo_name}}`
- `[ ]` Preview generation endpoint (uses sample data, smallest free model)

**Done When:** User can edit prompts in dashboard; preview generates output.

### 2.2 Free LLM Provider Abstraction
- `[ ]` Provider interface: `generate(prompt, options) → {content, tokens, model, provider}`
- `[ ]` **GitHub Models:** GitHub Models API via installation token (Fact 0008)
- `[ ]` **OpenRouter Free:** OpenRouter API with free model routing (Fact 0008)
- `[ ]` **NVIDIA NIM Free:** NVIDIA API with Nemotron models (Fact 0008)
- `[ ]` **Google AI Studio Free:** Gemini API (Fact 0008)
- `[ ]` Fallback chain with health checks + automatic failover
- `[ ]` Token/cost tracking per provider per content type in `llm_usage` table
- `[ ]` Response parsing: structured JSON output for consistency

**Done When:** Generation request returns structured draft; fallback works when primary fails.

### 2.3 Content Generation Pipeline
- `[ ]` Trigger: GitHub Actions job on `RepoEventProcessed` (or Edge Function for low latency)
- `[ ]` Determine content types from event + repo config
- `[ ]` Build prompt chain: system → content-type → repo-context → user-overrides
- `[ ]` Call LLM provider abstraction with appropriate model per content type
- `[ ]` Create `ContentPiece` in `draft` status with generated content
- `[ ]` Link to triggering `RepoEvent` for attribution (Decision 0013)
- `[ ]` Retry with exponential backoff on LLM failures (max 3, then alert)

**Done When:** Git event → draft appears in dashboard with correct content type.

### 2.4 Content Types Implementation
- `[ ]` Release Notes: from tags + merged PRs + commits since last tag
- `[ ]` Technical Article: from significant PRs (size, labels, files changed)
- `[ ]` Product Announcement: from major releases, milestone tags
- `[ ]` Tutorial/Guide: from new API endpoints, config changes, feature flags

**Done When:** Each type generates appropriate structure; preview matches expectations.

---

## Phase 3: Web Dashboard (Vercel + Supabase)

### 3.1 Core Layout & Auth
- `[ ]` React + Vite + Tailwind + React Router setup (deployed to Vercel)
- `[ ]` Supabase Auth client: protected routes, org switcher, user menu
- `[ ]` Layout: sidebar nav, top bar (org, user, notifications), main content
- `[ ]` SSE connection via Supabase Realtime for live updates

**Done When:** Authenticated user sees dashboard with org switcher; real-time works.

### 3.2 Draft List & Filtering
- `[ ]` Dashboard home: paginated, filterable list of ContentPieces (Supabase query with RLS)
- `[ ]` Filters: status, content type, repo, date range, assignee
- `[ ]` Columns: title, type, repo, status, target channels, schedule, updated
- `[ ]` Real-time updates via Supabase Realtime subscriptions

**Done When:** List loads, filters work, new drafts appear without refresh.

### 3.3 Draft Detail & Editor
- `[ ]` Detail route: `/drafts/:id`
- `[ ]` Split view: left = git source (tabbed: commits, PRs, tags, changelog), right = editor
- `[ ]` Editor: TipTap with Markdown shortcuts (collaborative editing via Supabase Realtime optional)
- `[ ]` Toolbar: format, link, image, code block, mention user
- `[ ]` Auto-save to `ContentVersion` every 30s (Supabase upsert)

**Done When:** Editor loads draft; edits persist; git source visible.

### 3.4 Review Workflow
- `[ ]` Status badge with actions: Approve / Request Changes / Reject
- `[ ]` Comment threads on editor selections (Supabase Realtime for live collab)
- `[ ]` @mention autocomplete → notification
- `[ ]` Version comparison: AI original vs current vs previous
- `[ ]` Keyboard shortcuts (Procedure: review-content)

**Done When:** Full review flow works: comment → request changes → approve.

### 3.5 Scheduling & Publishing UI
- `[ ]` Schedule modal: date/time picker, timezone, channel checkboxes, recurring options
- `[ ]` Calendar view (Decision 0012): month/week/day, drag-drop reschedule, color coding
- `[ ]` ICS feed endpoint for external calendar sync (Edge Function)
- `[ ]` "Publish Now" button for approved drafts

**Done When:** Draft can be scheduled/published; appears on calendar; ICS feed valid.

### 3.6 Settings Pages
- `[ ]` Organization Settings: Repositories, AI Prompts, Publishing Channels, Notifications
- `[ ]` Project Settings: Event sources, default channels, prompt overrides
- `[ ]` User Profile: Notification preferences, quiet hours, digest frequency
- `[ ]` Free Tier Quota Dashboard: Vercel, Supabase, GitHub, OpenRouter, NVIDIA usage bars

**Done When:** All procedures work end-to-end; quota dashboard shows usage.

---

## Phase 4: Publishing & Notifications (Free Tier Adapters)

### 4.1 Publishing Channel Adapters (All Free Tier Compatible)
- `[ ]` Abstract `Publisher` interface: `publish(content, config) → {url, externalId}`
- `[ ]` **Blog:** Git push to GitHub Pages repo (via GitHub API, free) / Generic Webhook
- `[ ]` **Social:** Twitter API v2 (free tier), LinkedIn UGC (free), Mastodon (free), Bluesky ATProto (free)
- `[ ]` **Newsletter:** ConvertKit free / Beehiiv free / MailerSend free / SMTP (Supabase Edge Function)
- `[ ]` **Custom Webhook:** Generic HTTP POST
- `[ ]` Channel health check endpoint (Edge Function)

**Done When:** Each adapter publishes test content successfully; errors handled gracefully.

### 4.2 Publish Pipeline
- `[ ]` Scheduled jobs: Supabase Edge Functions cron (free 2M invocations) for future publishes
- `[ ]` Manual publish: API endpoint → enqueue immediate Edge Function
- `[ ]` Per-channel retry: 3x with exponential backoff (Edge Function)
- `[ ]` On success: update ContentPiece with URLs, external IDs, timestamps
- `[ ]` On persistent failure: alert via notification service

**Done When:** Scheduled publish fires at correct time; manual publish works; failures alert.

### 4.3 Notification Service
- `[ ]` Channel adapters: Email (Supabase Edge Function + Resend/SendGrid free), Slack/Discord/Teams webhooks, In-app (Supabase Realtime), Custom webhook
- `[ ]` Template system: Markdown + Handlebars variables (stored in DB)
- `[ ]` Event triggers: draft_created, review_requested, publish_scheduled, publish_due, publish_failed
- `[ ]` Reminder scheduler: Supabase Edge Function cron (daily) scans for overdue manual drafts, upcoming scheduled
- `[ ]` Preference resolution: org default → project override → user preference

**Done When:** Test notifications arrive in all channels; reminders fire on schedule.

---

## Phase 5: Analytics & Attribution

### 5.1 Event Tracking
- `[ ]` Analytics API: `POST /api/analytics/event` (Edge Function, batched)
- `[ ]` Web snippet for blog analytics (page views, scroll, time) — lightweight, self-hosted
- `[ ]` Platform webhooks: Twitter/X, LinkedIn engagement callbacks
- `[ ]` Newsletter provider webhooks: opens, clicks, unsubscribes

**Done When:** Events ingested; visible in raw event table.

### 5.2 Attribution Pipeline
- `[ ]` Link ContentPiece → triggering RepoEvent(s) → commits/PRs/tags
- `[ ]` Compute: content per repo/week, event-to-publish lag, generation success rate
- `[ ]` Team metrics: drafts generated, review turnaround, approval rate, publish success

**Done When:** Dashboard shows "Git → Content" funnel per repo.

### 5.3 Analytics Dashboard
- `[ ]` Org-level: content volume, channel distribution, engagement trends
- `[ ]` Project-level: repo activity vs content output, top performing pieces
- `[ ]` Team-level: reviewer workload, bottlenecks, SLA adherence
- `[ ]` Export: CSV/PDF for reporting

**Done When:** All three metric categories (Decision 0013) visible and filterable.

---

## Phase 6: Multi-Tenancy Hardening (Supabase RLS)

### 6.1 Row-Level Security (Guardrail: multi-tenancy-isolation)
- `[ ]` Supabase RLS policies on ALL tables with `org_id`
- `[ ]` Prisma middleware: defense-in-depth `WHERE org_id = ?`
- `[ ]` API middleware: validate `org_id` from Supabase JWT before DB access
- `[ ]` Integration tests: create 2 orgs, verify zero cross-leakage (attempt queries → expect 0 rows)
- `[ ]` Audit log: `cross_org_access_attempts` table (should remain empty)

**Done When:** Test suite proves isolation; audit log empty in CI.

### 6.2 Org Onboarding Flow
- `[ ]` First user from GitHub/GitLab org → auto-create org in VivaScribe (webhook handler)
- `[ ]` Invite flow: generate invite link, email (Supabase Edge Function + Resend free) + in-app notification
- `[ ]` Role: Owner, Admin, Editor, Viewer (RBAC via `memberships.role`)

**Done When:** New org signs up, invites team, roles enforced.

---

## Phase 7: Free Tier Quota Management (Guardrail: zero-infra-cost)

### 7.1 GitHub Free Tier Optimization (Public Cover Repo)
- `[ ]` GitHub App installation tokens (5,000 req/hr) for all API calls
- `[ ]` GraphQL queries for batch fetching (reduce round trips)
- `[ ]` Workflow caching: npm, Docker layers, Prisma client
- `[ ]` **Cover repo:** Public repo runs polling workflows — unlimited Actions minutes for public repos
- `[ ]` Matrix strategy: parallelize per-repo polling in cover repo workflow
- `[ ]` Minute budget alerts: warn at 70% of private repo quota (cover repo uses public quota)
- `[ ]` Self-hosted runner option (if needed) via GitHub Actions runner on free tier

**Done When:** Private repo Actions minutes < 1,400 (70%) under load test; cover repo handles bulk polling.

### 7.2 Supabase Free Tier Optimization
- `[ ]` Database: 500MB limit → archive old analytics, compress ContentVersions
- `[ ]` Edge Functions: 2M invocations/mo → batch jobs, optimize cold starts
- `[ ]` Realtime: concurrent connections limit → connection pooling
- `[ ]` Storage: 1GB → auto-cleanup temp files, compress assets
- `[ ]` Auth: 50K MAU → monitor, alert at 35K

**Done When:** All Supabase quotas < 70% under load test.

### 7.3 Vercel Free Tier Optimization
- `[ ]` Bandwidth: 100GB/mo → optimize assets, enable compression, CDN caching
- `[ ]` Edge Functions: execution time limits → keep functions fast
- `[ ]` Build minutes: optimize build, cache dependencies
- `[ ]` Alert at 70% bandwidth usage

**Done When:** Vercel usage < 70% under load test.

### 7.4 Free LLM Quota Management (Fact 0008)
- `[ ]` OpenRouter free: 50 req/day per model → rotate models, cache aggressively
- `[ ]` NVIDIA NIM free: developer tier limits → track usage
- `[ ]` GitHub Models: monitor rate limits
- `[ ]` Google AI Studio: daily limits
- `[ ]` Unified quota dashboard in settings
- `[ ]` Graceful degradation: reduce generation frequency, use smaller models

**Done When:** Zero paid LLM spend at 100 repos, 1000 events/hr.

---

## Phase 8: Polish & Launch Prep

### 8.1 Error Handling & Observability (Free Tier)
- `[ ]` Structured logging (pino) → Supabase Logs + GitHub Actions logs
- `[ ]` Error tracking: Sentry free tier (5K errors/mo) or self-hosted via Supabase
- `[ ]` Health checks: `/health` (liveness), `/ready` (readiness) Edge Functions
- `[ ]` Metrics: Vercel Analytics + Supabase Dashboard + custom `free_tier_quotas` table
- `[ ]` Alerting: GitHub Actions workflow on schedule checks quotas → creates GitHub Issue

**Done When:** Dashboards show system health + quota usage; errors alerted via GitHub Issues.

### 8.2 Documentation (AI-Generated)
- `[ ]` API docs (OpenAPI/Swagger) — generated from code via AI
- `[ ]` User guide: dashboard walkthrough — AI-generated from procedures
- `[ ]` Admin guide: org setup, channels, prompts — AI-generated
- `[ ]` Developer guide: contributing, local dev, deployment — AI-generated
- `[ ]` AI Dev Guide: Cursor rules, Copilot prompts, PR review checklist

**Done When:** Docs published and linked from dashboard.

### 8.3 Deployment (Vercel + Supabase Only)
- `[ ]` Vercel: frontend deploy (preview + production) — connected to GitHub repo
- `[ ]` Supabase: all backend (DB, Auth, Edge Functions, Storage, Realtime)
- `[ ]` GitHub Actions: CI/CD + polling workflows
- `[ ]` Environment variables: Vercel + Supabase secrets (no external secret manager)
- `[ ]` Custom domain + SSL (Vercel automatic)
- `[ ]` Smoke tests post-deploy (GitHub Actions job)

**Done When:** Production URL serves dashboard; API responds; webhooks receive.

### 8.4 Launch Checklist
- `[ ]` Load test: 100 repos, 1000 events/hr (GitHub Actions matrix)
- `[ ]` Security audit: auth, RLS, secrets, dependencies (automated + AI review)
- `[ ]` Backup/restore verified (Supabase point-in-time recovery)
- `[ ]` Rollback plan documented (Vercel instant rollback + Supabase PITR)
- `[ ]` Free tier quota runbook: what to do at 80%, 90%, 95%
- `[ ]` On-call rotation defined (GitHub Issues for alerts)
- `[ ]` **Cover repo verified:** Public repo polls correctly, no VivaScribe traces in Actions logs, secrets rotated

**Done When:** All checks pass; team confident for launch.

---

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| GitHub API rate limits | GitHub App tokens (5K/hr) + GraphQL + caching + Actions polling fallback |
| LLM free tier exhaustion | Multi-provider fallback chain; aggressive caching; smaller models for preview |
| Supabase 500MB DB limit | Archive old data; compress versions; monitor at 70% |
| Vercel 100GB bandwidth | Optimize assets; CDN caching; monitor at 70% |
| GitHub Actions 2,000 min/mo (private) | **Public cover repo for polling** (unlimited public minutes); self-hosted runner option; matrix parallelization; alert at 70% |
| Supabase Edge Function 2M invocations | Batch jobs; optimize cold starts; monitor at 70% |
| Multi-tenant data leak | Supabase RLS (database-level) + Prisma middleware + integration tests |
| Webhook reliability | Retry with backoff; dead letter table; manual replay endpoint |
| Editor complexity | TipTap basic; Supabase Realtime for collab; defer Yjs |
| Schedule reliability | Supabase Edge Function cron + monitoring |
| **Opsec: Actions logs reveal watched repos** | **Public cover repo with generic workflow; no VivaScribe code/logic in public repo** |

---

## Milestone Gates

1. **M1 - Foundation** (Phase 0): Supabase + Vercel + Auth + CI/CD working
2. **M2 - Ingestion** (Phase 1): Webhooks + Actions polling → normalized events → drafts
3. **M3 - Generation** (Phase 2): Events → AI drafts (free LLM) in dashboard
4. **M4 - Review** (Phase 3): Full review workflow + calendar + real-time
5. **M5 - Publish** (Phase 4): Content lives on blog/social/newsletter (free adapters)
6. **M6 - Analytics** (Phase 5): Attribution + team metrics visible
7. **M7 - Hardening** (Phase 6-7): RLS proven, all quotas < 70%, zero paid infra
8. **M8 - Launch** (Phase 8): Production deployed, documented, monitored, free-tier-runbook ready

---

## Next Steps
1. Confirm plan with stakeholders
2. Assign owners per phase
3. Set up project board (GitHub Projects)
4. Begin Phase 0 (Supabase project + TurboRepo + AI dev setup)