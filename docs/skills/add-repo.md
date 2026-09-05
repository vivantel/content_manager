---
title: Add Repository to Watch
type: procedure
status: active
tags: [operations, onboarding, repos]
---

# Add Repository to Watch

**Purpose:** Connect a new git repository to VivaScribe for content generation.

**Prerequisites:**
- User has admin access to the repo on GitHub/GitLab
- User is member of the target organization in VivaScribe
- GitHub/GitLab OAuth connected with `repo` and `admin:repo_hook` scopes

**Steps:**
1. Navigate to Organization Settings → Repositories → "Add Repository"
2. Select Git provider (GitHub/GitLab)
3. Choose repository from accessible list (filtered by user's org membership)
4. Select repository type: Library / Application / Monorepo / Docs / Custom
5. Configure event sources (defaults applied based on type):
   - ☐ Commits to main branch
   - ☑ Merged PRs (configure label filters)
   - ☑ Tags/Releases
   - ☐ Changelog file changes (specify path)
6. Configure content generation:
   - Default content types to generate
   - Custom prompt overrides (optional)
7. Configure publishing:
   - Default target channels
   - Default schedule preference (scheduled vs manual)
8. Click "Connect Repository"
9. System:
   - Creates GitHub App installation / webhook
   - Registers webhook endpoint
   - Runs initial backfill (last 30 days of events)
   - Creates first batch of drafts

**Done When:**
- Repository appears in org's repo list with "Active" status
- Webhook verified (test payload received)
- Initial drafts generated and visible in dashboard
- Test notification sent to configured channels

**Rollback:** "Disconnect Repository" removes webhook, deletes pending drafts, preserves published content.