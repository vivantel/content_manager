# Cloudflare Zone Data Source

data "cloudflare_zone" "main" {
  name = var.cloudflare_zone_name
}

# DNS Records

resource "cloudflare_record" "web" {
  zone_id = data.cloudflare_zone.main.id
  name    = "vivascribe"
  type    = "CNAME"
  value   = cloudflare_pages_project.main.subdomain
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api.vivascribe"
  type    = "CNAME"
  value   = module.aws_lambda.function_url_host
  ttl     = 1
  proxied = true
}

# Cloudflare Pages Project

resource "cloudflare_pages_project" "main" {
  name         = "vivascribe"
  account_id   = var.cloudflare_account_id
  production_branch = "master"
  
  build_config {
    build_command   = "npm run build --filter=@vivascribe/web"
    destination_dir = "apps/web/dist"
    root_dir        = "apps/web"
    node_version    = "20"
    framework       = "vite"
  }
}

# Custom Domain for Pages

resource "cloudflare_pages_domain" "main" {
  project_name = cloudflare_pages_project.main.name
  domain       = "vivascribe.vivantel.dev"
  account_id   = var.cloudflare_account_id
}

# WAF Rules

resource "cloudflare_waf_rule" "rate_limit" {
  zone_id = data.cloudflare_zone.main.id
  action  = "block"
  priority = 1
  filter = {
    expression = "(http.request.count.rate(1m) > 1000)"
  }
  description = "Rate limit: 1000 req/min per IP"
}

resource "cloudflare_waf_rule" "bot_fight" {
  zone_id = data.cloudflare_zone.main.id
  action  = "challenge"
  priority = 2
  filter = {
    expression = "(cf.bot_management.score < 30)"
  }
  description = "Bot fight mode: challenge suspicious bots"
}

resource "cloudflare_waf_rule" "bad_ips" {
  zone_id = data.cloudflare_zone.main.id
  action  = "block"
  priority = 3
  filter = {
    expression = "(ip.src in $bad_ips_list)"
  }
  description = "Block known malicious IPs"
}

resource "cloudflare_waf_rule" "sql_injection" {
  zone_id = data.cloudflare_zone.main.id
  action  = "block"
  priority = 4
  filter = {
    expression = "(http.request.body contains \"union select\" or http.request.body contains \"drop table\")"
  }
  description = "Basic SQL injection protection"
}

resource "cloudflare_waf_rule" "xss" {
  zone_id = data.cloudflare_zone.main.id
  action  = "block"
  priority = 5
  filter = {
    expression = "(http.request.body contains \"<script>\" or http.request.body contains \"javascript:\")"
  }
  description = "Basic XSS protection"
}

# Zone Settings Override

resource "cloudflare_zone_settings_override" "main" {
  zone_id = data.cloudflare_zone.main.id
  settings {
    ssl                    = "full_strict"
    min_tls_version        = "1.2"
    always_use_https       = true
    automatic_https_rewrites = true
    brotli                 = true
    cache_level            = "standard"
    development_mode       = false
    security_level         = "medium"
  }
}

output "pages_domain" {
  value = cloudflare_pages_domain.main.hostname
}

output "api_domain" {
  value = "api.vivascribe.vivantel.dev"
}

output "web_dns_record" {
  value = cloudflare_record.web.id
}

output "api_dns_record" {
  value = cloudflare_record.api.id
}