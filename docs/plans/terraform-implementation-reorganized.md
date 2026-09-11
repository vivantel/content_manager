# Terraform Implementation Plan — Reorganized by Dependency on User

**Status:** Planning → Doing (async)

---

## 🔴 Category 1: Need User Consultancy First (Blocked)

| Task | Why Blocked | User Action Needed |
|------|-------------|-------------------|
| **Bootstrap: S3 bucket with Object Lock** | Requires AWS admin creds | Run `aws s3api create-bucket --object-lock-enabled-for-bucket` |
| **Bootstrap: OIDC Provider** | Requires AWS admin creds | Create GitHub Actions OIDC provider in IAM |
| **Bootstrap: Terraform Execution Role** | Requires AWS admin creds | Create IAM role with trust policy for GitHub OIDC |
| **Bootstrap: KMS Alias** | Requires AWS admin creds | Create `alias/vivascribe-secrets` → `aws/ssm` |
| **Bootstrap: GitHub Secrets** | Requires GitHub admin | Add `AWS_ROLE_ARN` + all app secrets to GitHub Actions |
| **Import Existing Resources** | Need confirmation | Confirm if Supabase project, Lambda, Cloudflare Pages exist |
| **Cloudflare Zone Confirmation** | Need confirmation | Confirm `vivantel.dev` zone exists in Cloudflare account |

---

## 🟡 Category 2: Can Do Without User (Async - Doing Now)

| Task | Status | Output |
|------|--------|--------|
| **Create Terraform module scaffolding** | 🟡 In Progress | `terraform/modules/` structure |
| **Module: aws-kms-ssm** | 🟡 In Progress | KMS alias + SSM parameters |
| **Module: supabase** | ⏳ Next | Project, Edge Functions, Auth, Settings |
| **Module: aws-lambda** | ⏳ Next | Lambda, IAM, Function URL |
| **Module: cloudflare** | ⏳ Next | DNS, Pages, WAF |
| **Module: github** | ⏳ Next | Repo settings, OIDC |
| **Root module composition** | ⏳ Next | `main.tf`, `providers.tf`, `variables.tf` |
| **Environment: prod** | ⏳ Next | `environments/prod/main.tf` |
| **CI/CD Workflow Update** | ⏳ Next | `.github/workflows/ci.yml` |

---

## 🟢 Category 3: Can Do Mostly Without User (Next Up)

| Task | Notes |
|------|-------|
| **Verify free tier compliance in code** | Add monitoring/alarms in Terraform |
| **Add documentation/examples** | Terraform usage, local dev |
| **Add integration tests** | Terratest or similar |
| **Cost monitoring dashboard** | CloudWatch + Cloudflare + Supabase |

---

## Current Work: Category 2 — Terraform Module Scaffolding

Starting with module scaffolding and `aws-kms-ssm` module now...