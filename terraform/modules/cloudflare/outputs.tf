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

output "zone_id" {
  value = data.cloudflare_zone.main.id
}