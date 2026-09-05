---
id: 0002
title: Target Platforms
type: decision
status: active
track: product
tags: [product, publishing, channels]
---

# Target Platforms: Multi-Channel Publishing

**Context:** Content must reach audiences where they are.

**Decision:** Support publishing to all major channels, configurable per content piece:
- Blog/website (Markdown/MDX) — technical articles, release notes
- Social media (Twitter/X, LinkedIn, Mastodon, Bluesky) — announcements, threads
- Newsletter (HTML/text email) — digests, deep dives
- Custom webhooks — for internal tools, CMS integration

**Rationale:**
- Different content types suit different channels
- Teams want single workflow, multi-output
- Avoids vendor lock-in

**Alternatives Considered:**
- Blog only: rejected — misses social reach
- Social only: rejected — no long-form home
- Single channel: rejected — too limiting