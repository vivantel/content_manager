---
id: 0019
title: Supabase Terraform Resources
type: fact
status: active
tags: [supabase, terraform, resources, provider]
---

# Supabase Terraform Resources

## Provider

`supabase/supabase` — Official Supabase Terraform Provider

## Resources Managed

| Resource | TF Resource | Key Attributes |
|----------|-------------|----------------|
| Project | `supabase_project` | `name`, `region`, `plan = "free"`, `database_password` (from KMS/SSM) |
| Edge Functions | `supabase_edge_function` | `name`, `project_ref`, `body` (zip), `verify_jwt = true` |
| Edge Function Secrets | `supabase_edge_function_secrets` | `function_name`, `secrets` (map) |
| Auth Providers | `supabase_third_party_auth` | `provider = "github"/"gitlab"`, `enabled = true`, `client_id`, `secret` |
| Project Settings | `supabase_project_settings` | `project_ref`, `auth_*` settings, rate limits |
| API Keys | `supabase_apikey` | `name`, `role = "anon"/"service_role"` |
| Preview Branches | `supabase_branch` | `name`, `project_ref`, `git_branch` |

## Edge Functions (12)

| Function | Path | Purpose |
|----------|------|---------|
| `webhook-github` | `apps/api/supabase/functions/webhook-github` | GitHub webhook receiver |
| `webhook-gitlab` | `apps/api/supabase/functions/webhook-gitlab` | GitLab webhook receiver |
| `ingest-poll` | `apps/api/supabase/functions/ingest-poll` | Poll ingestion from cover repo |
| `event-processing` | `apps/api/supabase/functions/event-processing` | Normalize/enrich events |
| `content-generation` | `apps/api/supabase/functions/content-generation` | AI content generation |
| `publish-blog` | `apps/api/supabase/functions/publish-blog` | Blog publishing |
| `publish-social` | `apps/api/supabase/functions/publish-social` | Social publishing |
| `publish-newsletter` | `apps/api/supabase/functions/publish-newsletter` | Newsletter publishing |
| `publish-webhook` | `apps/api/supabase/functions/publish-webhook` | Generic webhook publishing |
| `send-notification` | `apps/api/supabase/functions/send-notification` | Multi-channel notifications |
| `analytics-track` | `apps/api/supabase/functions/analytics-track` | Analytics ingestion |
| `auth-callback` | `apps/api/supabase/functions/auth-callback` | OAuth callback handler |

## Function Secrets (per function)

Stored via `supabase_edge_function_secrets`:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`, `GITHUB_MODELS_API_KEY`, `GOOGLE_AI_API_KEY`
- `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `TEAMS_WEBHOOK_URL`
- `GITHUB_TOKEN`, `GITLAB_TOKEN`

## Auth Configuration

| Provider | Config |
|----------|--------|
| GitHub | `enabled = true`, `client_id`, `secret`, `redirect_url` |
| GitLab | `enabled = true`, `client_id`, `secret`, `redirect_url` |

## Project Settings

- Auth: Email confirmations, phone confirmations, MFA
- Rate limits: API, Auth, Database
- Database: Connection pooling (PgBouncer)
- Realtime: Enabled on tables with RLS

---

## Classification

- **Type:** Descriptive (fact)
- **Track:** Process
- **Status:** Active