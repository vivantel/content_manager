# Terraform Implementation Plan

**Project:** VivaScribe Infrastructure as Code
**Status:** Planning
**Created:** 2026-09-11
**Target:** Full IaC deployment of Supabase, Cloudflare, AWS Lambda via Terraform

---

## Legend
- `[ ]` Pending
- `[~]` In Progress
- `[x]` Done
- `[!]` Blocked

---

## Phase 0: Bootstrap (One-time Setup)

### 0.1 S3 State Bucket
- `[ ]` Create S3 bucket `vivascribe-terraform-state-<account-id>-eu-north-1` with Object Lock enabled
- `[ ]` Enable versioning on bucket
- `[ ]` Verify Object Lock configuration

### 0.2 OIDC Provider
- `[ ]` Create GitHub Actions OIDC provider in AWS IAM
- `[ ]` Verify provider ARN

### 0.3 Terraform Execution Role
- `[ ]` Create IAM role `vivascribe-terraform-role` with trust policy for GitHub OIDC
- `[ ]` Attach least-privilege permissions policy
- `[ ]` Verify role assumption from GitHub Actions

### 0.4 KMS Alias
- `[ ]` Create alias `alias/vivascribe-secrets` → `aws/ssm` (AWS managed key)

### 0.5 GitHub Configuration
- `[ ]` Add `AWS_ROLE_ARN` secret to GitHub Actions
- `[ ]` Add all application secrets to GitHub Actions (see rotate-secrets.md)
- `[ ]` Enable GitHub Actions OIDC permissions

### 0.6 Terraform Init
- `[ ]` Configure backend.hcl with S3 bucket
- `[ ]` Run `terraform init` successfully

### 0.7 Import Existing Resources (if applicable)
- `[ ]` Import Supabase project (if exists)
- `[ ]` Import Cloudflare Pages project (if exists)
- `[ ]` Import Lambda function (if exists)

**Done When:** `terraform plan` runs successfully with no errors; GitHub Actions can assume role.

---

## Phase 1: Terraform Module Implementation

### 1.1 Root Module & Providers
- `[ ]` Create `terraform/backend.hcl` with S3 backend config
- `[ ]` Create `terraform/providers.tf` with AWS, Cloudflare, Supabase, GitHub providers
- `[ ]` Create `terraform/variables.tf` with all input variables
- `[ ]` Create `terraform/outputs.tf` with root outputs
- `[ ]` Create `terraform/main.tf` composing all modules

### 1.2 Module: aws-kms-ssm
- `[ ]` Create `modules/aws-kms-ssm/main.tf`
- `[ ]` KMS alias `alias/vivascribe-secrets` → `aws/ssm`
- `[ ]` SSM parameters for all secrets (`/vivascribe/*` as SecureString)
- `[ ]` Outputs: KMS key ARN, parameter names

### 1.3 Module: supabase
- `[ ]` Create `modules/supabase/main.tf`
- `[ ]` `supabase_project` resource (name, region, plan="free")
- `[ ]` `supabase_edge_function` × 12 (all functions from `apps/api/supabase/functions/`)
- `[ ]` `supabase_edge_function_secrets` for each function
- `[ ]` `supabase_third_party_auth` for GitHub + GitLab
- `[ ]` `supabase_project_settings` (auth config, rate limits)
- `[ ]` `supabase_apikey` for anon + service_role
- `[ ]` `supabase_branch` (optional, for preview envs)
- `[ ]` Dependencies: needs `aws-kms-ssm` for function secrets

### 1.4 Module: aws-lambda
- `[ ]` Create `modules/aws-lambda/main.tf`
- `[ ]` `aws_lambda_function` (Node.js 20, arm64, 512 MB, 15s timeout)
- `[ ]` `aws_lambda_function_url` (auth_type = NONE, CORS enabled)
- `[ ]` `aws_iam_role` + `aws_iam_policy` (CloudWatch Logs, X-Ray, SSM:GetParameters, KMS:Decrypt)
- `[ ]` `aws_cloudwatch_log_group` (3-day retention)
- `[ ]` Environment variables from SSM (referenced via module outputs)
- `[ ]` Dependencies: needs `aws-kms-ssm`

### 1.5 Module: cloudflare
- `[ ]` Create `modules/cloudflare/main.tf`
- `[ ]` Data source: `cloudflare_zone` for `vivantel.dev`
- `[ ]` `cloudflare_record` × 2 (vivascribe → Pages, api.vivascribe → Lambda Function URL)
- `[ ]` `cloudflare_pages_project` (name=vivascribe, build config)
- `[ ]` `cloudflare_pages_domain` (vivascribe.vivantel.dev)
- `[ ]` `cloudflare_waf_rule` × 5 (rate limit, bot fight, bad IPs, SQLi, XSS)
- `[ ]` `cloudflare_zone_settings_override` (SSL strict, TLS 1.2, HTTPS always, Brotli)
- `[ ]` Dependencies: needs `aws-lambda` for Function URL

### 1.6 Module: github
- `[ ]` Create `modules/github/main.tf`
- `[ ]` `github_repository` settings for `vivantel/content_manager`
- `[ ]` `github_branch_protection` for `master` branch
- `[ ]` `github_actions_oidc_subject_claim_customization_template` for Terraform role
- `[ ]` (Optional) `github_repository` for `vivantel/git-poller`

### 1.7 Module: s3-state (Reference)
- `[ ]` Create `modules/s3-state/main.tf` (data source only, bucket created manually)
- `[ ]` Output: bucket name for backend config

---

## Phase 2: Environment Composition

### 2.1 Prod Environment
- `[ ]` Create `environments/prod/main.tf`
- `[ ]` Compose all modules with prod-specific values
- `[ ]` Set `environment = "prod"` tag on all resources

---

## Phase 3: CI/CD Integration

### 3.1 GitHub Actions Workflow
- `[ ]` Update `.github/workflows/ci.yml` with:
  - Terraform plan/apply job (OIDC, needs secrets as TF_VAR_)
  - Build job (API + Web, upload artifacts)
  - Deploy Lambda job (zip → update-function-code)
  - Deploy Web job (verify build, Cloudflare Pages auto-deploys)

### 3.2 Secrets Injection
- `[ ]` Map all GitHub secrets to `TF_VAR_<name>` in Terraform job
- `[ ]` Verify all 12+ secrets pass through correctly

### 3.3 Build Optimization
- `[ ]` Cache npm dependencies
- `[ ]` Cache Terraform plugins
- `[ ]` Parallel jobs where possible

---

## Phase 4: Testing & Validation

### 4.1 Infrastructure Tests
- `[ ]` `terraform plan` shows expected changes
- `[ ]` `terraform apply` succeeds on clean apply
- `[ ]` `terraform plan` after apply shows no drift

### 4.2 Integration Tests
- `[ ]` Lambda Function URL responds to `/health`
- `[ ]` Cloudflare Pages serves `vivascribe.vivantel.dev`
- `[ ]` API DNS `api.vivascribe.vivantel.dev` resolves to Lambda
- `[ ]` Supabase Edge Functions accessible
- `[ ]` SSM parameters readable by Lambda
- `[ ]` WAF rules active (test rate limit)
- `[ ]` CloudWatch Logs receiving Lambda logs (3-day retention)

### 4.3 Free Tier Verification
- `[ ]` Lambda duration < 400K GB-sec/mo (monitor first month)
- `[ ]` Cloudflare Pages builds < 500/mo
- `[ ]` GitHub Actions minutes < 2,000/mo
- `[ ]` Supabase DB < 500 MB
- `[ ]` All services within free tier limits

---

## Phase 5: Documentation & Handoff

### 5.1 Runbooks
- `[ ]` Update `bootstrap-terraform.md` with actual values
- `[ ]` Update `deploy-infrastructure.md` with workflow details
- `[ ]` Update `rotate-secrets.md` with rotation schedule

### 5.2 Monitoring Setup
- `[ ]` CloudWatch Alarms for Lambda errors/duration
- `[ ]` Cloudflare Analytics for Pages traffic
- `[ ]` Supabase Dashboard for DB usage
- `[ ]` GitHub Actions workflow monitoring

### 5.3 Team Handoff
- `[ ]` Walkthrough with team
- [ ] Document emergency procedures (rollback, mass rotation)
- [ ] Calendar reminders for secret rotations

---

## Dependencies

```
Bootstrap (Phase 0)
    ↓
Module Implementation (Phase 1) — parallel where possible
    ↓
Environment Composition (Phase 2)
    ↓
CI/CD Integration (Phase 3)
    ↓
Testing & Validation (Phase 4)
    ↓
Documentation (Phase 5)
```

---

## Status Markers

- `[ ]` Pending
- `[~]` In Progress
- `[x]` Done
- `[!]` Blocked

---

## Verification Criteria

Each step's "Done When" must be satisfied by its own preceding steps. A step is complete only when:
1. All code/files created
2. Tests pass (where applicable)
3. Verification commands succeed
4. No drift in subsequent `terraform plan`

---

## Next Actions

1. Start Phase 0 (Bootstrap) - requires AWS admin access
2. Create Terraform module skeleton
3. Implement modules in dependency order
4. Test in CI/CD pipeline
5. Validate free tier compliance

---

## Classification

- **Type:** Plan (implementation plan)
- **Track:** Process
- **Status:** Draft → Active upon approval