---
id: 0005
title: Authentication Method
type: fact
status: active
tags: [auth, security, integration]
---

# Authentication Method

**Primary:** Git OAuth (GitHub and GitLab)
- Used for both user authentication and repository access tokens
- Scopes: read:user, user:email, repo (for private repos), admin:repo_hook (for webhooks)

**Session Management:** JWT access tokens + refresh tokens (httpOnly cookies)
**Org Membership:** Derived from GitHub/GitLab org membership via API
**No email/password or SSO in MVP** — can be added later if needed