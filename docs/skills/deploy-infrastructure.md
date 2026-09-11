---
title: Deploy Infrastructure
type: procedure
status: active
tags: [terraform, deploy, ci-cd, github-actions, supabase, cloudflare, aws]
---

# Deploy Infrastructure via Terraform

## Prerequisites

- Bootstrap complete (see `bootstrap-terraform.md`)
- GitHub Actions configured with OIDC role
- All secrets in GitHub Actions secrets

---

## Automated Deployment (GitHub Actions)

### Trigger

On every push to `master` branch.

### Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI/CD

on:
  push:
    branches: [master]

env:
  NODE_VERSION: '20'
  AWS_REGION: eu-north-1
  TF_VERSION: '1.8'

jobs:
  terraform:
    name: Terraform Plan & Apply
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Terraform Init
        run: cd terraform && terraform init
      - name: Terraform Plan
        run: cd terraform && terraform plan -out=tfplan
        env:
          TF_VAR_supabase_db_password: ${{ secrets.SUPABASE_DB_PASSWORD }}
          TF_VAR_github_app_private_key: ${{ secrets.VIVASCRIBE_GITHUB_PRIVATE_KEY }}
          TF_VAR_github_webhook_secret: ${{ secrets.VIVASCRIBE_GITHUB_WEBHOOK_SECRET }}
          TF_VAR_github_client_secret: ${{ secrets.VIVASCRIBE_GITHUB_CLIENT_SECRET }}
          TF_VAR_openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
          TF_VAR_telegram_bot_token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TF_VAR_github_app_id: ${{ secrets.VIVASCRIBE_GITHUB_APP_ID }}
          TF_VAR_github_client_id: ${{ secrets.VIVASCRIBE_GITHUB_CLIENT_ID }}
          TF_VAR_github_client_secret: ${{ secrets.VIVASCRIBE_GITHUB_CLIENT_SECRET }}
      - name: Terraform Apply
        if: github.ref == 'refs/heads/master'
        run: cd terraform && terraform apply -auto-approve tfplan

  build:
    name: Build Applications
    needs: terraform
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build --filter=@vivascribe/api
      - run: npm run build --filter=@vivascribe/web
      - uses: actions/upload-artifact@v4
        with:
          name: api-dist
          path: apps/api/dist/
      - uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: apps/web/dist/

  deploy-lambda:
    name: Deploy Lambda
    needs: build
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: api-dist
          path: apps/api/dist/
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Deploy Lambda
        run: |
          cd apps/api/dist
          zip -r function.zip .
          aws lambda update-function-code \
            --function-name vivascribe-api \
            --zip-file fileb://function.zip \
            --region ${{ env.AWS_REGION }}

  deploy-web:
    name: Deploy Web (Cloudflare Pages)
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: apps/web/dist/
      # Cloudflare Pages deploys automatically via GitHub integration
      # This step just verifies the build artifact
      - name: Verify Build
        run: ls -la apps/web/dist/

```

---

## Manual Deployment (Emergency/Recovery)

```bash
# 1. Configure AWS credentials
export AWS_PROFILE=admin  # or use configure-aws-credentials

# 2. Initialize
cd terraform/
terraform init

# 3. Plan
terraform plan -out=tfplan

# 4. Apply
terraform apply tfplan

# 4. Build & Deploy Lambda manually
cd ../apps/api
npm run build
cd dist && zip -r ../function.zip .
aws lambda update-function-code \
  --function-name vivascribe-api \
  --zip-file fileb://../function.zip \
  --region eu-north-1
```

---

## Post-Deployment Verification

```bash
# 1. Check Lambda function
aws lambda get-function --function-name vivascribe-api --region eu-north-1

# 2. Test Function URL
curl https://<function-id>.lambda-url.eu-north-1.on.aws/health

# 3. Check Cloudflare Pages
curl -I https://vivascribe.vivantel.dev

# 4. Check API DNS
curl -I https://api.vivascribe.vivantel.dev/health

# 5. Check Supabase Edge Functions
curl -I https://<project-ref>.supabase.co/functions/v1/webhook-github

# 5. Check SSM Parameters
aws ssm get-parameters-by-path --path /vivascribe --with-decryption --region eu-north-1
```

---

## Rollback Procedure

```bash
# 1. Terraform rollback (if apply failed)
terraform apply -refresh-only  # Refresh state
terraform plan -destroy -out=destroy-plan  # Plan destroy (careful!)
# OR: Revert Git commit and re-apply

# 2. Lambda rollback
aws lambda update-function-code \
  --function-name vivascribe-api \
  --zip-file fileb://previous-function.zip \
  --region eu-north-1

# 3. Cloudflare Pages rollback
# Via Cloudflare Dashboard → Pages → Deployments → Rollback
```

---

## Classification

- **Type:** Procedural
- **Track:** Process
- **Status:** Active