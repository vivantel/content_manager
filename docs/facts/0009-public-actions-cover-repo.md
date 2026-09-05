---
id: 0009
title: Public GitHub Actions Cover Repository
type: fact
status: active
tags: [architecture, github, security, opsec, privacy]
---

# Public GitHub Actions Cover Repository

**Practice:** Use a public GitHub repository as a "cover" for ALL GitHub Actions workloads (CI/CD builds + polling workflows), leaving no trace of the actual VivaScribe system being built.

**Implementation:**
- Create a public repo (e.g., `vivantel/git-poller` or generic name)
- Store reusable workflows:
  - `.github/workflows/ci.yml` — lint, typecheck, test, build (generic Node.js/TypeScript project)
  - `.github/workflows/git-poll.yml` — poll git repos and notify webhook
- Workflows call VivaScribe API endpoints via secrets (API URL, auth tokens)
- No VivaScribe source code, logic, or configuration in the public repo
- Workflows are generic: "build TypeScript project" and "poll git repos" — reusable for any similar system
- Private repo mirrors pushes to cover repo (or uses `repository_dispatch`) to trigger CI

**Benefits:**
- **All** GitHub Actions minutes consumed on public repo (unlimited for public repos on free tier)
- Private repo Actions used only for deployments (Vercel, Supabase) — minimal usage
- No association between Actions activity and VivaScribe product
- Competitors cannot discover watched repos, polling frequency, build frequency, or system architecture from public Actions logs
- Plausible deniability: repo appears to be a generic "git poller + TS builder" utility

**Security:**
- Secrets stored in public repo settings (encrypted): `VIVASCRIBE_API_URL`, `VIVASCRIBE_WEBHOOK_SECRET`, `VIVASCRIBE_DEPLOY_TOKEN`
- API validates webhook signature + origin IP (GitHub Actions IP ranges)
- Rate limiting on ingest/deploy endpoints per installation token

**Trade-off:** Slightly more complex setup (two repos, mirror push), but zero Actions cost + significant opsec advantage for a content intelligence platform.