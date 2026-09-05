---
id: 0005
title: Event Sources
type: decision
status: active
track: product
tags: [product, git, events, triggers]
---

# Event Sources: All Sources Configurable Per Repo

**Context:** Different repos have different meaningful signals.

**Decision:** Support all event sources, each configurable per repository:
- Commits to main/default branch
- Merged pull requests (with label/type filtering)
- Git tags / releases published
- CHANGELOG.md or similar file changes
- GitHub Discussions / Issues with specific labels (future)

**Rationale:**
- Release-focused repos care about tags
- Feature-heavy repos care about merged PRs
- Docs-focused repos care about changelog edits
- One-size-fits-all misses important signals

**Implementation:** Per-repo configuration in dashboard with sensible defaults per repo type (library, app, monorepo, etc.)