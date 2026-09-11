---
id: 0018
title: Full IaC Scope
type: decision
status: active
track: process
tags: [terraform, iac, supabase, cloudflare, aws, github, scope]
---

# Full IaC Scope: Supabase, Cloudflare, AWS, GitHub

## Context

We decided on Full IaC (Decision 0015). This decision defines the exact scope of what Terraform manages across all providers.

## Decision

**Terraform Manages (Full IaC):**

### Supabase Provider (`supabase/supabase`)
| Resource | TF Resource | Purpose |
|----------|-------------|---------|
| Project | `supabase_project` | Create project, region, plan |
| Edge Functions | `supabase_edge_function` + `supabase_edge_function_secrets` | 12 functions from `apps/api/supabase/functions/` |
| Auth Providers | `supabase_third_party_auth` | GitHub + GitLab OAuth |
| Project Settings | `supabase_project_settings` | Auth config, rate limits |
| API Keys | `supabase_apikey` | Anon + Service Role keys |
| Preview Branches | `supabase_branch` | Optional preview envs |

**Gaps (handled separately):**
- Storage buckets: Dashboard/API
- Realtime: Enabled by default on RLS tables
- Database migrations: Prisma (CI/CD step)

### Cloudflare Provider (`cloudflare/cloudflare`)
| Resource | TF Resource | Purpose |
|----------|-------------|---------|
| DNS Records | `cloudflare_record` | `vivascribe.vivantel.dev` → Pages, `api.vivascribe.vivantel.dev` → Lambda |
| Pages Project | `cloudflare_pages_project` | Project `vivascribe`, build config |
| Custom Domain | `cloudflare_pages_domain` | `vivascribe.vivantel.dev` |
| WAF Rules | `cloudflare_waf_rule` | Rate limiting, bot fight mode |
| Zone Settings | `cloudflare_zone_settings_override` | SSL, caching, security |

**Deployments:** Cloudflare Pages GitHub integration (not TF)

### AWS Provider (`hashicorp/aws`)
| Resource | TF Resource | Purpose |
|----------|-------------|---------|
| Lambda Function | `aws_lambda_function` | `vivascribe-api`, Node.js 20, arm64, 512 MB, 15s |
| IAM Role | `aws_iam_role` | Lambda execution role |
| IAM Policy | `aws_iam_policy` | CloudWatch Logs, X-Ray, SSM:GetParameters, KMS:Decrypt |
| KMS Alias | `aws_kms_alias` | `alias/vivascribe-secrets` → `aws/ssm` |
| SSM Parameters | `aws_ssm_parameter` | SecureString for each secret |
| Function URL | `aws_lambda_function_url` | Public HTTPS endpoint |
| CloudWatch Log Group | `aws_cloudwatch_log_group` | 3-day retention |

### GitHub Provider (`integrations/github`)
| Resource | TF Resource | Purpose |
|----------|-------------|---------|
| Repository Settings | `github_repository` | Branch protection, rules |
| Branch Protection | `github_branch_protection` | Main branch rules |
| OIDC Provider | `github_actions_oidc_subject_claim_customization_template` | Trust policy for TF |

**Not managed by TF:** GitHub Actions secrets (source of truth), workflow files (in repo)

### S3 State Bucket
- Created manually once (Object Lock required at creation)
- Referenced in backend config

## Not Managed by Terraform

- Supabase Storage buckets (dashboard)
- Supabase Realtime (enabled by default)
- Database migrations (Prisma in CI/CD)
- Cloudflare Pages deployments (GitHub integration)
- GitHub Actions secrets (source of truth)
- GitHub Actions workflow files (in repo)
- Cover repo secrets (manual)

## Rationale

- Supabase provider now supports all needed resources (Edge Functions, Auth, Projects)
- Cloudflare provider fully supports DNS, Pages, WAF
- AWS provider covers all Lambda needs
- GitHub provider for repo settings only (secrets stay in GH)
- Single environment (prod) keeps complexity minimal

## Implications

- Requires importing existing Supabase project if already created
- Cloudflare zone `vivantel.dev` must exist
- Lambda function created once, then updated via CI/CD
- All resources tagged for cost tracking

---

## Classification

- **Type:** Axiomatic
- **Track:** Process
- **Status:** Active