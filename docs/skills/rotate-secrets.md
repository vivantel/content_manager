---
title: Rotate Secrets
type: procedure
status: active
tags: [secrets, rotation, kms, ssm, terraform, security]
---

# Rotate Secrets

## Prerequisites

- Terraform deployed and state accessible
- GitHub repository admin access
- AWS CLI with appropriate permissions (or GitHub Actions)

---

## Rotation Process

### For Application Secrets (OpenRouter, Telegram, GitHub App, etc.)

1. **Generate new secret** at provider (OpenRouter, Telegram BotFather, GitHub App settings)

2. **Update GitHub Actions secret:**
   - Go to GitHub → Settings → Secrets → Actions
   - Update the corresponding secret (e.g., `OPENROUTER_API_KEY`)

3. **Trigger Terraform apply:**
   ```bash
   # Via GitHub Actions (preferred)
   # Push empty commit to master, or use workflow_dispatch
   
   # Or manually:
   cd terraform/
   terraform apply -auto-approve
   ```

4. **Verify rotation:**
   ```bash
   # Check SSM parameter updated
   aws ssm get-parameter --name /vivascribe/OPENROUTER_API_KEY --with-decryption --region eu-north-1
   
   # Trigger Lambda cold start (new invocation)
   curl https://api.vivascribe.vivantel.dev/health
   ```

---

### For Supabase Keys

**Anon Key / Service Role Key:**

1. Go to Supabase Dashboard → Project Settings → API
2. Click "Reset" on the key to rotate
2. Update GitHub secret: `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
3. Run Terraform apply

**Database Password:**

1. Supabase Dashboard → Database → Reset password
2. Update GitHub secret: `SUPABASE_DB_PASSWORD`
4. Run Terraform apply
5. **Note:** This requires Prisma migration re-run and app restart

---

### For GitHub App Credentials

**Private Key:**

1. GitHub App settings → Private keys → Generate new
2. Download new `.pem` file
3. Update GitHub secret: `VIVASCRIBE_GITHUB_PRIVATE_KEY` (paste entire PEM)
4. Run Terraform apply

**Client Secret:**

1. GitHub App settings → Client secrets → Generate new
2. Update GitHub secret: `VIVASCRIBE_GITHUB_CLIENT_SECRET`
4. Run Terraform apply

**Webhook Secret:**

1. Generate new: `openssl rand -hex 32`
2. Update GitHub App settings → Webhook secret
3. Update GitHub secret: `VIVASCRIBE_GITHUB_WEBHOOK_SECRET`
4. Run Terraform apply

---

### For Telegram Bot Token

1. Message @BotFather → `/revoke` → select bot → confirm
2. Copy new token
3. Update GitHub secret: `TELEGRAM_BOT_TOKEN`
4. Run Terraform apply

---

### For OpenRouter API Key

1. OpenRouter Dashboard → API Keys → Revoke old → Create new
2. Update GitHub secret: `OPENROUTER_API_KEY`
3. Run Terraform apply

---

## Verification Checklist

After each rotation:

- [ ] GitHub secret updated
- [ ] Terraform apply succeeded (no errors)
- [ ] SSM parameter shows new value (with decryption)
- [ ] Lambda cold start works (test endpoint)
- [ ] Application functionality verified (test relevant feature)
- [ ] No errors in Lambda logs (CloudWatch)

---

## Emergency: Mass Rotation (Compromise)

If multiple secrets compromised simultaneously:

```bash
# 1. Revoke ALL provider secrets at source
# 2. Generate all new secrets
# 2. Update ALL GitHub secrets at once
# 3. Run single Terraform apply
cd terraform/
terraform apply -auto-approve

# 4. Force Lambda cold starts (update dummy env var)
aws lambda update-function-configuration \
  --function-name vivascribe-api \
  --environment Variables={FORCE_ROTATION=$(date +%s)} \
  --region eu-north-1
```

---

## Schedule

| Secret | Rotation Frequency | Trigger |
|--------|-------------------|---------|
| API Keys (OpenRouter, Telegram) | 90 days | Calendar reminder |
| GitHub App Private Key | 180 days | Calendar reminder |
| GitHub Webhook Secret | 180 days | Calendar reminder |
| Supabase Keys | 365 days | Calendar reminder |
| Database Password | 365 days | Calendar reminder |

---

## Automation (Future)

- GitHub Actions scheduled workflow (cron) to check secret age
- Automated PR with rotated secrets (for review)
- Integration with 1Password/Bitwarden for secret generation

---

## Classification

- **Type:** Procedural
- **Track:** Process
- **Status:** Active