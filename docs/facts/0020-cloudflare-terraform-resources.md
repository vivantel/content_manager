---
id: 0020
title: Cloudflare Terraform Resources
type: fact
status: active
tags: [cloudflare, terraform, resources, dns, pages, waf]
---

# Cloudflare Terraform Resources

## Provider

`cloudflare/cloudflare` — Official Cloudflare Terraform Provider

## Resources Managed

### DNS Records (`cloudflare_record`)

| Name | Type | Content | Proxied | TTL |
|------|------|---------|---------|-----|
| `vivascribe` | CNAME | `<pages-project>.pages.dev` | true | Auto |
| `api.vivascribe` | CNAME | `<lambda-function-url>` | true | Auto |

### Pages Project (`cloudflare_pages_project`)

| Attribute | Value |
|-----------|-------|
| `name` | `vivascribe` |
| `account_id` | `<cloudflare-account-id>` |
| `production_branch` | `master` |
| `build_config.build_command` | `npm run build --filter=@vivascribe/web` |
| `build_config.destination_dir` | `apps/web/dist` |
| `build_config.root_dir` | `apps/web` |
| `build_config.node_version` | `20` |
| `build_config.framework` | `vite` |

### Custom Domain (`cloudflare_pages_domain`)

| Attribute | Value |
|-----------|-------|
| `project_name` | `vivascribe` |
| `domain` | `vivascribe.vivantel.dev` |

### WAF Rules (`cloudflare_waf_rule`)

| Rule | Expression | Action | Description |
|------|------------|--------|-------------|
| Rate Limit | `(http.request.count.rate(1m) > 1000)` | Block (429) | 1000 req/min per IP |
| Bot Fight Mode | `cf.bot_management.score < 30` | Challenge | Challenge suspicious bots |
| Known Bad IPs | `ip.src in $bad_ips_list` | Block | Block known malicious IPs |
| SQL Injection | `http.request.body contains "union select"` | Block | Basic SQLi protection |
| XSS Protection | `http.request.body contains "<script>"` | Block | Basic XSS protection |

### Zone Settings Override (`cloudflare_zone_settings_override`)

| Setting | Value |
|---------|-------|
| `ssl` | `full_strict` |
| `min_tls_version` | `1.2` |
| `always_use_https` | `true` |
| `automatic_https_rewrites` | `true` |
| `brotli` | `true` |
| `cache_level` | `standard` |
| `development_mode` | `false` |
| `security_level` | `medium` |

### Zone

- Zone: `vivantel.dev` (pre-existing, data source)
- Account: Pre-existing Cloudflare account

---

## Not Managed by Terraform

- Pages deployments (handled by Cloudflare Pages GitHub integration)
- Workers (not used)
- Workers KV/D1 (not used)
- Zero Trust/Access (not needed)

---

## Classification

- **Type:** Descriptive (fact)
- **Track:** Process
- **Status:** Active