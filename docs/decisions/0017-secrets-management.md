---
id: 0017
title: Secrets Management Pattern
type: decision
status: active
track: process
tags: [secrets, kms, ssm, security, terraform, github-actions]
---

# Secrets Management: GitHub → Terraform → KMS → SSM → Lambda Runtime

## Context

Secrets must flow from source of truth (GitHub Actions secrets) to runtime (Lambda) without exposure, using free-tier services.

## Decision

**Flow:**
```
GitHub Actions secrets (source of truth)
    ↓ (CI/CD pipeline, OIDC auth)
Terraform apply (reads via TF_VAR_ env vars)
    ↓
AWS KMS (alias to AWS managed key) encrypts
    ↓
SSM Parameter Store (SecureString)
    ↓
Lambda runtime: fetches from SSM at cold start, caches in memory
```

**Implementation Details:**

1. **GitHub Secrets (source):** All secrets stored as GitHub Actions repository/organization secrets
2. **Terraform Input:** CI/CD injects as `TF_VAR_<secret_name>` environment variables
3. **KMS:** Alias `alias/vivascribe-secrets` pointing to AWS managed key `aws/ssm` (no custom key cost)
4. **SSM:** Parameters stored as `SecureString` under `/vivascribe/<secret-name>`
5. **Lambda Runtime:** On cold start, fetch all `/vivascribe/*` parameters, decrypt via KMS, cache in memory for invocations

**Secret List:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

**Rotation:** Manual Terraform re-apply (triggered by updating GitHub secret + TF apply)

## Rationale

- GitHub secrets as source of truth: audit trail, RBAC, familiar to team
- Terraform as deployment mechanism: audit trail, drift detection
- KMS alias to AWS managed key: free, no custom key cost
- SSM SecureString: free tier (10K parameters, 40K API calls/mo)
- Lambda cold-start fetch: no secrets in code, no env var exposure, automatic decryption
- No Lambda Extensions needed (simpler, free tier friendly)

## Alternatives Considered

- Lambda env vars: Exposes secrets in console, no rotation
- Secrets Manager: Costs $0.40/secret/month over free tier
- Parameter Store Standard: No encryption at rest
- Lambda Extensions: Adds complexity, cold start overhead

## Implications

- All secrets flow through Terraform — TF state contains encrypted values
- CI/CD must have OIDC role with KMS encrypt/decrypt + SSM put/get permissions
- Lambda runtime needs SSM:GetParameters + KMS:Decrypt permissions
- Manual rotation: update GitHub secret → TF apply

## Related

- 0015: Deployment Architecture
- 0016: Terraform State Backend
- Guardrail: Secrets via KMS-SSM
- Procedure: Rotate Secrets

---

## Classification

- **Type:** Axiomatic
- **Track:** Process
- **Status:** Active