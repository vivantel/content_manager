---
id: 0016
title: Terraform State Backend
type: decision
status: active
track: process
tags: [terraform, state, s3, object-lock, backend]
---

# Terraform State Backend: S3 with Object Locking

## Context

Terraform requires a backend to store state. We need a free-tier eligible, reliable backend with locking.

## Decision

Use S3 bucket with Object Locking (versioning-based locking) for Terraform state.

**Backend Configuration:**
```hcl
terraform {
  backend "s3" {
    bucket         = "vivascribe-terraform-state-<account-id>-eu-north-1"
    key            = "vivascribe/infrastructure/terraform.tfstate"
    region         = "eu-north-1"
    use_lockfile   = true
    object_lock    = true
  }
}
```

**Bucket Requirements:**
- Created with `--object-lock-enabled-for-bucket` (cannot enable on existing bucket)
- Versioning enabled
- No DynamoDB lock table needed
- Object Lock provides native S3-level locking via version IDs

**Bootstrap Order:**
1. Create bucket manually (one-time, before any Terraform)
2. Enable versioning
3. Configure backend in Terraform
4. Run `terraform init`

## Rationale

- S3 + DynamoDB is standard but DynamoDB adds cost/complexity
- Object Lock provides native S3 locking via versioning (free)
- S3 free tier: 5 GB storage, 20K requests/mo — state file is ~1 MB
- No separate lock table to manage
- Standard AWS feature, well-supported by Terraform

## Alternatives Considered

- Terraform Cloud: Free tier limited to 500 runs/mo, less control
- S3 + DynamoDB: Adds cost, extra resource to manage
- Local backend: Not suitable for team/CI

## Implications

- Bucket must be created with Object Lock enabled from start
- Cannot migrate existing bucket to Object Lock
- Versioning required for locking to work
- State file locked during Terraform operations via S3 version ID

## Related

- Guardrail: S3 State with Object Lock
- Procedure: Bootstrap Terraform

---

## Classification

- **Type:** Axiomatic
- **Track:** Process
- **Status:** Active