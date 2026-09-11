---
title: Bootstrap Terraform
type: procedure
status: active
tags: [terraform, bootstrap, setup, onboarding, s3, oidc, iam]
---

# Bootstrap Terraform Infrastructure

## Prerequisites

- AWS CLI configured with admin credentials
- GitHub repository `vivantel/content_manager` exists
- Cloudflare account with zone `vivantel.dev`
- Supabase account (or create via TF)
- Terraform >= 1.5 installed locally

---

## Step 1: Create S3 State Bucket (One-time)

```bash
# Replace <account-id> with your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="vivascribe-terraform-state-${ACCOUNT_ID}-eu-north-1"

# Create bucket with Object Lock (REQUIRED at creation)
aws s3api create-bucket \
  --bucket "${BUCKET}" \
  --region eu-north-1 \
  --object-lock-enabled-for-bucket

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "${BUCKET}" \
  --versioning-configuration Status=Enabled

# Verify
aws s3api get-bucket-versioning --bucket "${BUCKET}"
aws s3api get-object-lock-configuration --bucket "${BUCKET}"
```

**Done when:** Bucket exists with Object Lock + Versioning enabled.

---

## Step 2: Create OIDC Provider for GitHub Actions

```bash
# Check if provider exists
aws iam list-open-id-connect-providers | grep token.actions.githubusercontent.com

# If not exists, create
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**Done when:** OIDC provider `arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com` exists.

---

## Step 3: Create Terraform Execution Role

```bash
# Trust policy
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
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
EOF

# Replace <ACCOUNT_ID>
sed -i "s/<ACCOUNT_ID>/${ACCOUNT_ID}/g" trust-policy.json

# Create role
aws iam create-role \
  --role-name vivascribe-terraform-role \
  --assume-role-policy-document file://trust-policy.json

# Attach permissions policy (create inline policy)
cat > terraform-permissions.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "iam:CreateRole", "iam:DeleteRole", "iam:PutRolePolicy", "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:GetRole",
        "kms:CreateAlias", "kms:DescribeKey", "kms:ListAliases",
        "ssm:PutParameter", "ssm:DeleteParameter", "ssm:GetParameter",
        "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket",
        "cloudwatch:PutMetricAlarm", "cloudwatch:DescribeAlarms",
        "logs:CreateLogGroup", "logs:PutRetentionPolicy"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["supabase:*", "cloudflare:*"],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name vivascribe-terraform-role \
  --policy-name TerraformPermissions \
  --policy-document file://terraform-permissions.json
```

**Done when:** Role `vivascribe-terraform-role` exists with trust policy + permissions.

---

## Step 4: Create KMS Alias

```bash
# Create alias pointing to AWS managed SSM key
aws kms create-alias \
  --alias-name alias/vivascribe-secrets \
  --target-key-id alias/aws/ssm
```

**Done when:** `aws kms describe-key --key-id alias/vivascribe-secrets` shows `KeyManager: AWS`.

---

## Step 5: Initialize Terraform

```bash
cd terraform/
terraform init
```

**Done when:** `terraform init` completes successfully, backend configured.

---

## Step 6: Import Existing Resources (if any)

```bash
# Import Supabase project if already exists
terraform import supabase_project.main <project-ref>

# Import Cloudflare zone (data source)
# No import needed for data sources

# Import existing Lambda if exists
terraform import aws_lambda_function.main vivascribe-api

# Import existing Cloudflare Pages project
terraform import cloudflare_pages_project.main vivascribe
```

**Done when:** `terraform plan` shows no changes for imported resources.

---

## Step 7: Configure GitHub Repository

1. Add GitHub secrets (Settings → Secrets → Actions):
   - `AWS_ROLE_ARN`: `arn:aws:iam::<account-id>:role/vivascribe-terraform-role`
   - All application secrets (see Secrets via KMS-SSM guardrail)

2. Enable GitHub Actions OIDC: Settings → Actions → General → Allow GitHub Actions to create and approve pull requests

**Done when:** GitHub Actions can assume role and run Terraform.

---

## Verification

```bash
# Test Terraform plan from local
cd terraform/
terraform plan

# Should show planned changes (no errors)
```

---

## Done When

- [ ] S3 bucket with Object Lock + Versioning
- [ ] OIDC provider for GitHub Actions
- [ ] Terraform execution role with least-privilege permissions
- [ ] KMS alias `alias/vivascribe-secrets` → `aws/ssm`
- [ ] Terraform init succeeds
- [ ] Existing resources imported (if applicable)
- [ ] GitHub Actions can assume role and run Terraform

---

## Classification

- **Type:** Procedural
- **Track:** Process
- **Status:** Active