variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "supabase_db_password" {
  description = "Supabase database password"
  type        = string
  sensitive   = true
}

variable "supabase_organization_id" {
  description = "Supabase organization ID"
  type        = string
}

variable "supabase_access_token" {
  description = "Supabase personal access token"
  type        = string
  sensitive   = true
}

variable "github_client_id" {
  description = "GitHub OAuth Client ID"
  type        = string
}

variable "github_client_secret" {
  description = "GitHub OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "gitlab_client_id" {
  description = "GitLab OAuth Client ID"
  type        = string
}

variable "gitlab_client_secret" {
  description = "GitLab OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "openrouter_api_key" {
  description = "OpenRouter API key"
  type        = string
  sensitive   = true
}

variable "nvidia_api_key" {
  description = "NVIDIA API key"
  type        = string
  sensitive   = true
}

variable "github_models_api_key" {
  description = "GitHub Models API key"
  type        = string
  sensitive   = true
}

variable "google_ai_api_key" {
  description = "Google AI API key"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key"
  type        = string
  sensitive   = true
}

variable "telegram_bot_token" {
  description = "Telegram bot token"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL"
  type        = string
  sensitive   = true
}

variable "discord_webhook_url" {
  description = "Discord webhook URL"
  type        = string
  sensitive   = true
}

variable "teams_webhook_url" {
  description = "Teams webhook URL"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "gitlab_token" {
  description = "GitLab personal access token"
  type        = string
  sensitive   = true
}

variable "create_preview_branch" {
  description = "Create preview branch"
  type        = bool
  default     = false
}