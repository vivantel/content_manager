---
id: 0003
title: Content Types
type: decision
status: active
track: product
tags: [product, content, types]
---

# Content Types: All Types Supported

**Context:** Git activity generates diverse content opportunities.

**Decision:** Support all content types, each with specialized prompts/pipelines:
- Release notes / changelogs — from tags, PRs, commit messages
- Technical articles / deep dives — from significant PRs, architecture decisions
- Product announcements — from major releases, milestones
- Educational content / tutorials — from new features, API changes

**Rationale:**
- Single system handles full content lifecycle
- Shared context (git history) improves all outputs
- Teams don't need multiple tools

**Alternatives Considered:**
- Release notes only: rejected — underserves content potential
- Articles only: rejected — misses automated changelog value