---
title: Configurable Event Sources Per Repo
type: guardrail
status: active
tags: [product, git, events, configuration]
---

# Configurable Event Sources Per Repository

**Rule:** Every connected repository must have explicit configuration for which git events trigger content consideration. No global-only defaults that cannot be overridden per repo.

**Enforcement:**
- Repo onboarding flow requires event source selection (with sensible defaults)
- API rejects repo creation without `event_sources` config
- Dashboard shows current config with edit capability
- Watcher service reads per-repo config at runtime (not hardcoded)

**Defaults by Repo Type (overridable):**
- Library: tags, merged PRs with "release" label
- Application: tags, merged PRs, changelog changes
- Monorepo: tags, merged PRs with path filters
- Docs: changelog changes, merged PRs with "docs" label