---
title: Configure AI Generation Prompts
type: procedure
status: active
tags: [operations, ai, prompts, configuration]
---

# Configure AI Generation Prompts

**Purpose:** Customize how VivaScribe generates content from git events.

**Context:** System uses prompt chains (system → content-type → repo-context → user-overrides). No static templates.

**Steps:**
1. Navigate to Organization Settings → AI Prompts
2. View prompt library organized by content type:
   - Release Notes
   - Technical Article
   - Product Announcement
   - Tutorial/Guide
3. For each content type:
   - **System Prompt** (global, read-only): Core instructions, tone, format
   - **Content-Type Prompt** (org-level, editable): Structure, sections, examples
   - **Repo Context Prompt** (per-repo, optional): Product-specific terminology, audience
4. Edit any org-level prompt:
   - Use variables: `{{commits}}`, `{{prs}}`, `{{tags}}`, `{{changelog}}`, `{{repo_name}}`, `{{org_name}}`
   - Preview with sample git data (fetch from connected repo)
   - Save as new version (version history retained)
5. Test generation:
   - Select a recent git event
   - Click "Generate Preview"
   - Review output, adjust prompt, repeat
6. Set as active version for org (or per-repo override)

**Done When:**
- Prompt saved with version number
- Preview generation succeeds
- At least one test output reviewed and approved

**Notes:**
- Prompt versions immutable; new edits create new version
- Rollback: select previous version as active
- GitHub Models (free tier) used for preview when available