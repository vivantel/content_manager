---
id: 0011
title: Content Templates
type: decision
status: active
track: process
tags: [product, templates, prompts, ai]
---

# Content Templates: Prompt-Based Only

**Context:** Need flexible, versionable generation instructions.

**Decision:** No explicit template files. Instead:
- Prompts stored in database, versioned per content type per org
- Prompt chains: system prompt → content-type prompt → repo-specific context → user overrides
- Prompt library UI in dashboard for editing/testing
- GitHub free tier models used where possible (Fact 0006)

**Rationale:**
- Prompts more flexible than static templates for varied git events
- Version control + A/B testing built in
- Non-technical users can edit prompts in UI
- Avoids template markup language complexity

**Alternatives Considered:**
- Global + project override templates: rejected — prompt chains subsume this
- Template marketplace: rejected — not needed for MVP
- Template files in repo: rejected — couples content to code repo