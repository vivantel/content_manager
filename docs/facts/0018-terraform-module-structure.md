---
id: 0018
title: Terraform Module Structure
type: fact
status: active
tags: [terraform, modules, structure, architecture]
---

# Terraform Module Structure

## Structure

```
terraform/
├── backend.hcl              # S3 backend configuration
├── main.tf                  # Root module composition
├── providers.tf             # Provider configurations
├── variables.tf             # Input variables
├── outputs.tf               # Root outputs
├── modules/
│   ├── supabase/            # Supabase project, auth, edge functions
│   ├── cloudflare/          # DNS, Pages, WAF
│   ├── aws-lambda/          # Lambda function, IAM role
│   ├── aws-kms-ssm/         # KMS alias, SSM parameters
│   ├── github/              # Repo settings, OIDC
│   └── s3-state/            # S3 bucket with Object Lock (reference)
└── environments/
    └── prod/
        └── main.tf          # Prod environment composition
```

## Module Responsibilities

| Module | Resources | Key Outputs |
|--------|-----------|-------------|
| `supabase` | Project, Edge Functions, Auth, Settings, API Keys | `project_id`, `project_ref`, `api_keys` |
| `cloudflare` | DNS, Pages Project, WAF, Custom Domains | `pages_domain`, `dns_records` |
| `aws-lambda` | Lambda Function, IAM Role, Function URL | `function_name`, `function_url`, `function_arn` |
| `aws-kms-ssm` | KMS Alias, SSM Parameters | `kms_key_arn`, `ssm_parameter_names` |
| `github` | Repo Settings, Branch Protection, OIDC | `repo_id`, `oidc_provider_arn` |
| `s3-state` | (Reference only) | `bucket_name` |

## Composition

Root `main.tf` composes all modules in dependency order:
1. `aws-kms-ssm` (no deps)
2. `supabase` (needs KMS for secrets)
3. `aws-lambda` (needs KMS/SSM for env vars)
4. `cloudflare` (needs Lambda Function URL for DNS)
5. `github` (independent)

## Environment

Single environment: `prod` (in `environments/prod/main.tf`)

---

## Classification

- **Type:** Descriptive (fact)
- **Track:** Process
- **Status:** Active