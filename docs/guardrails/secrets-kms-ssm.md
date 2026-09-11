---
title: Secrets via KMS-SSM
type: guardrail
status: active
tags: [secrets, kms, ssm, security, lambda, terraform]
---

# Secrets Management via KMS-SSM

## Rule

All secrets MUST flow: GitHub Actions secrets → Terraform → KMS (alias to AWS managed key) → SSM Parameter Store (SecureString) → Lambda runtime fetch. No secrets in code, env vars, or Terraform state plaintext.

## Implementation

### Flow

```
GitHub Secrets (source)
    ↓ TF_VAR_ env vars in CI/CD
Terraform apply
    ↓
KMS alias/vivascribe-secrets → aws/ssm (managed key)
    ↓
SSM Parameter Store: /vivascribe/* (SecureString)
    ↓
Lambda cold start: GetParameters + KMS:Decrypt → memory cache
```

### Terraform SSM Parameters

```hcl
resource "aws_ssm_parameter" "secrets" {
  for_each = var.secrets
  name  = "/vivascribe/${each.key}"
  type  = "SecureString"
  value = each.value
  key_id = "alias/vivascribe-secrets"
}
```

### KMS Configuration

- **Key:** AWS managed key `aws/ssm` (free)
- **Alias:** `alias/vivascribe-secrets` → `aws/ssm`
- **No custom key** — avoids $1/month key cost

### Lambda Runtime Fetch

```typescript
// On cold start
const params = await ssm.getParameters({
  names: Object.keys(secrets).map(k => `/vivascribe/${k}`),
  withDecryption: true
}).promise();

// Cache in memory for subsequent invocations
const secretCache = Object.fromEntries(
  params.Parameters.map(p => [p.Name.replace('/vivascribe/', ''), p.Value])
);
```

### Lambda IAM Permissions

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameters", "kms:Decrypt"],
  "Resource": [
    "arn:aws:ssm:eu-north-1:*:parameter/vivascribe/*",
    "arn:aws:kms:eu-north-1:*:key/*"
  ]
}
```

## Secrets List

| Parameter | Source |
|-----------|--------|
| `SUPABASE_URL` | GitHub Secret |
| `SUPABASE_ANON_KEY` | GitHub Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secret |
| `OPENROUTER_API_KEY` | GitHub Secret |
| `TELEGRAM_BOT_TOKEN` | GitHub Secret |
| `GITHUB_APP_ID` | GitHub Secret |
| `GITHUB_PRIVATE_KEY` | GitHub Secret |
| `GITHUB_WEBHOOK_SECRET` | GitHub Secret |
| `GITHUB_CLIENT_ID` | GitHub Secret |
| `GITHUB_CLIENT_SECRET` | GitHub Secret |

## Rotation Procedure

1. Update secret in GitHub Actions secrets
2. Trigger Terraform apply (manual or scheduled)
3. Terraform updates SSM parameters
4. Next Lambda cold start fetches new values

## Enforcement

- No secrets in code (`.env`, config files, Terraform state plaintext)
- No secrets in Lambda environment variables (console visible)
- No secrets in GitHub Actions logs (masked)
- SSM parameters MUST be `SecureString`
- KMS key MUST be `alias/vivascribe-secrets` (AWS managed)

## Free Tier Compliance

| Service | Free Tier | Usage |
|---------|-----------|-------|
| KMS (aws/ssm) | Free | Alias only |
| SSM Parameters | 10,000 | ~15 |
| SSM API Calls | 40,000/mo | Minimal |
| KMS Requests | 20,000/mo | Minimal |

## Rationale

- Single source of truth: GitHub secrets (audit, RBAC)
- Terraform audit trail for secret deployment
- KMS alias to managed key = free encryption
- SSM SecureString = free encrypted storage
- Lambda runtime fetch = no secrets at rest in Lambda
- Memory cache = fast subsequent invocations

## Violations

- Secrets in code/Terraform state → immediate remediation
- Plaintext SSM parameters → re-create as SecureString
- Custom KMS key → replace with alias to aws/ssm
- Secrets in Lambda env vars → remove, use SSM fetch
- Unencrypted secret in logs → rotate immediately

---

## Classification

- **Type:** Normative (guardrail)
- **Track:** Process
- **Status:** Active