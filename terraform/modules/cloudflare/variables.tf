variable "cloudflare_zone_name" {
  description = "Cloudflare zone name"
  type        = string
  default     = "vivantel.dev"
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}