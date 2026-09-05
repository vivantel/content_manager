---
title: Set Up Publishing Channels
type: procedure
status: active
tags: [operations, publishing, channels, integrations]
---

# Set Up Publishing Channels

**Purpose:** Configure where content gets published.

**Prerequisites:** Admin access to target platforms (blog CMS, social accounts, email service).

**Steps:**

### Blog / Website (Markdown/MDX)
1. Settings → Publishing Channels → "Add Channel" → Blog
2. Choose integration:
   - **Git-based:** Push to repo (GitHub Pages, Netlify, Vercel) — provide repo + branch + path
   - **API-based:** Contentful, Sanity, Ghost, WordPress REST — provide API token + space ID
   - **Webhook:** Custom endpoint — provide URL + secret
3. Configure front-matter schema (title, slug, date, tags, authors)
4. Test: "Publish Test Post" → verify appears on site

### Social Media
1. Settings → Publishing Channels → "Add Channel" → Social
2. Select platforms: Twitter/X, LinkedIn, Mastodon, Bluesky
3. OAuth connect each platform (VivaScribe app)
4. Configure defaults per platform:
   - Hashtags, mentions, link shortening
   - Thread vs single post
   - Image generation (AI or from repo assets)
5. Test: "Post Test" → verify appears on each platform

### Newsletter
1. Settings → Publishing Channels → "Add Channel" → Newsletter
2. Choose provider: ConvertKit, Beehiiv, MailerSend, SendGrid, Custom SMTP
3. Provide API key / SMTP credentials
4. Configure template: header, footer, unsubscribe link, styling
5. Test: "Send Test Email" → verify in inbox

### Custom Webhook
1. Settings → Publishing Channels → "Add Channel" → Webhook
2. Provide: URL, HTTP method, headers, payload template (JSON)
3. Test: "Send Test Payload" → verify receipt

**Done When:**
- Each channel shows "Connected" status
- Test publish succeeds for each
- Default channels set for new content (org-level)

**Notes:** Channels can be enabled/disabled per content piece at schedule time.