---
title: S3 State with Object Lock
type: guardrail
status: active
tags: [terraform, state, s3, object-lock, locking, free-tier]
---

# S3 State with Object Locking

## Rule

Terraform state MUST be stored in S3 with Object Locking enabled (versioning-based locking). No DynamoDB lock table.

## Implementation

### Backend Configuration

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

### Bucket Requirements (One-time Setup)

```bash
# Create bucket with Object Lock enabled (CANNOT enable on existing bucket)
aws s3api create-bucket \
  --bucket vivascribe-terraform-state-<account-id>-eu-north-1 \
  --region eu-north-1 \
  --object-lock-enabled-for-bucket

# Enable versioning (required for Object Lock)
aws s3api put-bucket-versioning \
  --bucket vivascribe-terraform-state-<account-id>-eu-north-1 \
  --versioning-configuration Status=Enabled
```

**Critical:** Object Lock MUST be enabled at bucket creation. Cannot enable on existing bucket.

### Locking Mechanism

- Terraform acquires lock by writing a lock object with unique version ID
- Object Lock prevents overwrite/deletion during lock period
- Lock released automatically on operation completion
- No separate DynamoDB table needed

## Enforcement

- Terraform `init` fails if bucket lacks Object Lock
- CI/CD `terraform init` validates backend configuration
- Bucket policy prevents accidental deletion

## Free Tier Compliance

| Resource | Free Tier | Our Usage |
|----------|-----------|-----------|
| S3 Storage | 5 GB | ~1 MB (state file) |
| S3 Requests | 20,000/mo | Minimal (init, plan, apply) |
| Object Lock | Free | Enabled |

No DynamoDB = no additional cost.

## Rationale

- Eliminates DynamoDB lock table cost/complexity
- S3 Object Lock is native, free, and managed
- Versioning provides audit trail of state changes
- Standard Terraform feature, well-tested

## Violations

- State stored locally → not permitted
- DynamoDB lock table created → remove immediately
- Bucket without Object Lock → recreate with Object Lock
- State file manually modified → investigate immediately

---

## Classification

- **Type:** Normative (guardrail)
- **Track:** Process
- **Status:** Active