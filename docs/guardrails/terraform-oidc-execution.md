---
title: Terraform Execution via GitHub OIDC
type: guardrail
status: active
tags: [terraform, github-actions, oidc, security, ci-cd]
---

# Terraform Execution via GitHub OIDC

## Rule

Terraform MUST execute in GitHub Actions using OIDC authentication to AWS. No static AWS credentials (access keys) in GitHub secrets.

## Implementation

### GitHub Actions Workflow

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::<account-id>:role/vivascribe-terraform-role
      aws-region: eu-north-1
  - name: Terraform Init/Apply
    run: |
      terraform init
      terraform plan -out=tfplan
      terraform apply tfplan
```

### AWS IAM Role (`vivascribe-terraform-role`)

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:vivantel/content_manager:*"
      }
    }
  }]
}
```

**Permissions Policy:** Scoped to Terraform-managed resources only:
- `supabase:*` (via provider API calls)
- `cloudflare:*` (via provider API calls)
- `aws:lambda:*`, `aws:iam:*`, `aws:kms:*`, `aws:ssm:*`, `aws:s3:*` (state bucket)
- `github:*` (repo settings)

### Required GitHub Permissions

```yaml
permissions:
  id-token: write    # Required for OIDC
  contents: read     # Required for checkout
```

## Enforcement

- CI/CD fails if `aws-actions/configure-aws-credentials` not used
- No `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in GitHub secrets
- IAM role permissions reviewed quarterly

## Rationale

- Eliminates static credentials (rotation, leakage risk)
- Short-lived tokens (1 hour max)
- Audit trail via CloudTrail + GitHub Actions logs
- Principle of least privilege via IAM conditions
- Free (no additional AWS cost)

## Violations

- Static AWS keys in GitHub secrets → immediate revocation
- Terraform running outside CI/CD → not permitted
- Over-permissive IAM role → immediate scope reduction

---

## Classification

- **Type:** Normative (guardrail)
- **Track:** Process
- **Status:** Active