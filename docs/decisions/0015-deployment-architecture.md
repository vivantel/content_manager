---
id: 0015
title: Deployment Architecture
type: decision
status: active
track: process
tags: [architecture, deployment, infrastructure, terraform, supabase, cloudflare, aws]
---

# Deployment Architecture: Full IaC with Supabase, Cloudflare, AWS Lambda

## Context

We need a deployment architecture that runs entirely within SaaS free tiers (Guardrail: zero-infra-cost) while providing:
- PostgreSQL backend (Supabase)
- Static web hosting + DDoS protection (Cloudflare)
- API compute (AWS Lambda eu-north-1)
- Full Infrastructure as Code via Terraform
- Secrets management via GitHub → Terraform → KMS → SSM

## Decision

Deploy all infrastructure via Terraform with the following architecture:

**Supabase (PostgreSQL + Edge Functions + Auth):**
- Project creation, database, auth providers, edge functions, settings, API keys
- Managed via Supabase Terraform provider (supports all needed resources)

**Cloudflare (Web + DNS + DDoS):**
- Pages project for static web dashboard (`vivascribe.vivantel.dev`)
- DNS records for `vivascribe.vivantel.dev` (Pages) and `api.vivascribe.vivantel.dev` (Lambda)
- WAF rules for DDoS prevention
- Pages deployments via Cloudflare GitHub integration

**AWS Lambda (API Compute):**
- Single Lambda function in eu-north-1 running Fastify via `@fastify/aws-lambda`
- 512 MB, arm64, 15s timeout, 3-day log retention
- No VPC (Supabase public HTTPS)
- IAM role with CloudWatch Logs + X-Ray permissions

**Secrets Management:**
- GitHub Actions secrets (source of truth)
- Terraform reads via env vars → AWS KMS (alias to AWS managed key) → SSM Parameter Store (SecureString)
- Lambda fetches from SSM at cold start, caches in memory

**State Management:**
- S3 bucket with Object Locking (versioning-based locking)
- No DynamoDB lock table
- Bucket: `vivascribe-terraform-state-<account-id>-eu-north-1`

**CI/CD:**
- GitHub Actions with OIDC to AWS (no static keys)
- Terraform plan/apply on every push to master
- Build → Lambda zip → update-function-code
- Cloudflare Pages via GitHub integration

## Rationale

- Full IaC ensures reproducibility, drift detection, audit trail
- Supabase provider now supports Edge Functions, Auth, Projects — gaps closed
- Cloudflare Pages + DNS + WAF fully supported by TF
- AWS Lambda free tier fits with 512 MB arm64 15s timeout
- S3 Object Lock eliminates DynamoDB cost/complexity
- OIDC eliminates static AWS credentials in GitHub
- KMS alias to AWS managed key avoids custom key cost
- Single environment (prod) keeps complexity minimal

## Alternatives Considered

- Vercel for web: Replaced by Cloudflare Pages (better DDoS, same free tier)
- Supabase Edge Functions for API: Replaced by Lambda (more control, same free tier)
- DynamoDB for TF locking: Replaced by S3 Object Lock (free, simpler)
- Custom KMS key: Replaced by AWS managed key alias (free)
- Multiple environments: Deferred (single prod now, dev later)

## Implications

- Requires Terraform bootstrap (S3 bucket with Object Lock, OIDC provider, IAM role)
- Supabase project must be imported if already exists
- Cloudflare zone `vivantel.dev` must exist
- Lambda function must be created once, then updated via CI/CD
- All secrets flow: GitHub → TF → KMS/SSM → Lambda runtime

## Related Decisions

- 0016: Terraform State Backend
- 0017: Secrets Management Pattern
- 0018: Full IaC Scope

---

## Classification

- **Type:** Axiomatic (intent/decision record)
- **Track:** Process
- **Status:** Active