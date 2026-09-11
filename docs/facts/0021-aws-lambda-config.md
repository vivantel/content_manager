---
id: 0021
title: AWS Lambda Configuration
type: fact
status: active
tags: [aws, lambda, configuration, free-tier, serverless]
---

# AWS Lambda Configuration

## Function Details

| Attribute | Value |
|-----------|-------|
| **Function Name** | `vivascribe-api` |
| **Runtime** | `nodejs20.x` |
| **Architecture** | `arm64` |
| **Handler** | `dist/index.handler` |
| **Memory** | `512 MB` |
| **Timeout** | `15 seconds` |
| **Log Retention** | `3 days` |
| **Region** | `eu-north-1` |
| **Function URL** | Enabled, `NONE` auth (public) |

## Free Tier Optimization

| Parameter | Free Tier Limit | Our Config | Monthly Capacity |
|-----------|-----------------|------------|------------------|
| Duration | 400,000 GB-sec | 0.5 GB × 15s = 7.5 GB-sec/inv | ~53,333 invocations |
| Requests | 1,000,000 | N/A | 1,000,000 |
| **Result** | | | **Well within free tier** |

## Code Deployment

| Step | Method |
|------|--------|
| Build | `npm run build --filter=@vivascribe/api` → `apps/api/dist/` |
| Bundle | `esbuild` or `tsc` + `npm pack` (includes `node_modules`) |
| Package | Zip `apps/api/dist/` → `function.zip` |
| Deploy | `aws lambda update-function-code --zip-file fileb://function.zip` |

## Handler Adapter

- Library: `@fastify/aws-lambda`
- Converts Fastify app to Lambda handler
- Handles API Gateway / Function URL event format
- Supports SSE via chunked responses

## IAM Role (`vivascribe-lambda-role`)

### Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

### Permissions Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:eu-north-1:*:log-group:/aws/lambda/vivascribe-api:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:ssm:eu-north-1:*:parameter/vivascribe/*",
        "arn:aws:kms:eu-north-1:*:key/*"
      ]
    }
  ]
}
```

## KMS Configuration

- **Key:** AWS managed key `aws/ssm` (free)
- **Alias:** `alias/vivascribe-secrets` → `aws/ssm`
- **Usage:** SSM Parameter Store encryption at rest

## SSM Parameters (`/vivascribe/*`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `/vivascribe/SUPABASE_URL` | SecureString | Supabase project URL |
| `/vivascribe/SUPABASE_ANON_KEY` | SecureString | Supabase anon key |
| `/vivascribe/SUPABASE_SERVICE_ROLE_KEY` | SecureString | Supabase service role key |
| `/vivascribe/OPENROUTER_API_KEY` | SecureString | OpenRouter API key |
| `/vivascribe/TELEGRAM_BOT_TOKEN` | SecureString | Telegram bot token |
| `/vivascribe/GITHUB_APP_ID` | SecureString | GitHub App ID |
| `/vivascribe/GITHUB_PRIVATE_KEY` | SecureString | GitHub App private key |
| `/vivascribe/GITHUB_WEBHOOK_SECRET` | SecureString | GitHub webhook secret |
| `/vivascribe/GITHUB_CLIENT_ID` | SecureString | GitHub OAuth client ID |
| `/vivascribe/GITHUB_CLIENT_SECRET` | SecureString | GitHub OAuth client secret |

## Function URL Configuration

| Setting | Value |
|---------|-------|
| `auth_type` | `NONE` (public) |
| `cors` | Enabled (allow all origins for now) |
| `invoke_mode` | `BUFFERED` |

## CloudWatch Log Group

| Attribute | Value |
|-----------|-------|
| Name | `/aws/lambda/vivascribe-api` |
| Retention | 3 days |
| KMS Key | None (default) |

---

## Classification

- **Type:** Descriptive (fact)
- **Track:** Process
- **Status:** Active