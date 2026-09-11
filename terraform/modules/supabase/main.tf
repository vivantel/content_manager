# Supabase Project

resource "supabase_project" "main" {
  name          = "vivascribe"
  region        = "eu-west-1"
  plan          = "free"
  database_password = var.supabase_db_password
  organization_id = var.supabase_organization_id
}

# Supabase Edge Functions

resource "supabase_edge_function" "functions" {
  for_each = {
    "webhook-github"        = { path = "apps/api/supabase/functions/webhook-github" }
    "webhook-gitlab"        = { path = "apps/api/supabase/functions/webhook-gitlab" }
    "ingest-poll"           = { path = "apps/api/supabase/functions/ingest-poll" }
    "event-processing"      = { path = "apps/api/supabase/functions/event-processing" }
    "content-generation"    = { path = "apps/api/supabase/functions/content-generation" }
    "publish-blog"          = { path = "apps/api/supabase/functions/publish-blog" }
    "publish-social"        = { path = "apps/api/supabase/functions/publish-social" }
    "publish-newsletter"    = { path = "apps/api/supabase/functions/publish-newsletter" }
    "publish-webhook"       = { path = "apps/api/supabase/functions/publish-webhook" }
    "send-notification"     = { path = "apps/api/supabase/functions/send-notification" }
    "analytics-track"       = { path = "apps/api/supabase/functions/analytics-track" }
    "auth-callback"         = { path = "apps/api/supabase/functions/auth-callback" }
  }
  project_ref = supabase_project.main.id
  name        = each.key
  body        = filebase64("${path.module}/../../../${each.value.path}/index.ts")
  verify_jwt  = true
}

# Edge Function Secrets

resource "supabase_edge_function_secrets" "function_secrets" {
  for_each = supabase_edge_function.functions
  project_ref = supabase_project.main.id
  function_name = each.key
  secrets = {
    SUPABASE_URL               = supabase_project.main.url
    SUPABASE_SERVICE_ROLE_KEY  = supabase_project.main.service_role_key
    OPENROUTER_API_KEY         = var.openrouter_api_key
    NVIDIA_API_KEY             = var.nvidia_api_key
    GITHUB_MODELS_API_KEY      = var.github_models_api_key
    GOOGLE_AI_API_KEY          = var.google_ai_api_key
    RESEND_API_KEY             = var.resend_api_key
    TELEGRAM_BOT_TOKEN         = var.telegram_bot_token
    SLACK_WEBHOOK_URL          = var.slack_webhook_url
    DISCORD_WEBHOOK_URL        = var.discord_webhook_url
    TEAMS_WEBHOOK_URL          = var.teams_webhook_url
    GITHUB_TOKEN               = var.github_token
    GITLAB_TOKEN               = var.gitlab_token
  }
}

# GitHub OAuth Provider

resource "supabase_third_party_auth" "github" {
  project_ref = supabase_project.main.id
  provider    = "github"
  enabled     = true
  client_id   = var.github_client_id
  secret      = var.github_client_secret
}

# GitLab OAuth Provider

resource "supabase_third_party_auth" "gitlab" {
  project_ref = supabase_project.main.id
  provider    = "gitlab"
  enabled     = true
  client_id   = var.gitlab_client_id
  secret      = var.gitlab_client_secret
}

# Project Settings

resource "supabase_project_settings" "main" {
  project_ref = supabase_project.main.id
  auth = {
    site_url = "https://vivascribe.vivantel.dev"
    additional_redirect_urls = [
      "https://vivascribe.vivantel.dev/auth/callback"
    ]
    jwt_expiry = 3600
    refresh_token_rotation_enabled = true
    secure_password_change_enabled = true
  }
  database = {
    pooler_enabled = true
    pooler_mode = "transaction"
  }
  api = {
    max_rows = 1000
  }
  realtime = {
    enabled = true
  }
}

# API Keys

resource "supabase_apikey" "anon" {
  project_ref = supabase_project.main.id
  name        = "anon"
  role        = "anon"
}

resource "supabase_apikey" "service_role" {
  project_ref = supabase_project.main.id
  name        = "service_role"
  role        = "service_role"
}

# Preview Branch (optional)

resource "supabase_branch" "preview" {
  count = var.create_preview_branch ? 1 : 0
  project_ref = supabase_project.main.id
  name        = "preview"
  git_branch  = "preview"
}

output "project_id" {
  value = supabase_project.main.id
}

output "project_ref" {
  value = supabase_project.main.id
}

output "project_url" {
  value = supabase_project.main.url
}

output "service_role_key" {
  value = supabase_project.main.service_role_key
  sensitive = true
}

output "anon_key" {
  value = supabase_project.main.anon_key
  sensitive = true
}