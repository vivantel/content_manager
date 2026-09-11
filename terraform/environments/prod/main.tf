# Production Environment Composition

module "aws_kms_ssm" {
  source = "../../modules/aws-kms-ssm"
  
  environment = var.environment
  secrets = {
    SUPABASE_URL               = module.supabase.project_url
    SUPABASE_ANON_KEY          = module.supabase.anon_key
    SUPABASE_SERVICE_ROLE_KEY  = module.supabase.service_role_key
    OPENROUTER_API_KEY         = var.openrouter_api_key
    TELEGRAM_BOT_TOKEN         = var.telegram_bot_token
    GITHUB_APP_ID              = var.github_app_id
    GITHUB_PRIVATE_KEY         = var.github_app_private_key
    GITHUB_WEBHOOK_SECRET      = var.github_webhook_secret
    GITHUB_CLIENT_ID           = var.github_client_id
    GITHUB_CLIENT_SECRET       = var.github_client_secret
  }
}

module "supabase" {
  source = "../../modules/supabase"
  
  environment                = var.environment
  supabase_db_password       = var.supabase_db_password
  supabase_organization_id   = var.supabase_organization_id
  supabase_access_token      = var.supabase_access_token
  github_client_id           = var.github_client_id
  github_client_secret       = var.github_client_secret
  gitlab_client_id           = var.gitlab_client_id
  gitlab_client_secret       = var.gitlab_client_secret
  openrouter_api_key         = var.openrouter_api_key
  nvidia_api_key             = var.nvidia_api_key
  github_models_api_key      = var.github_models_api_key
  google_ai_api_key          = var.google_ai_api_key
  resend_api_key             = var.resend_api_key
  telegram_bot_token         = var.telegram_bot_token
  slack_webhook_url          = var.slack_webhook_url
  discord_webhook_url        = var.discord_webhook_url
  teams_webhook_url          = var.teams_webhook_url
  github_token               = var.github_token
  gitlab_token               = var.gitlab_token
}

module "aws_kms_ssm" {
  source = "../../modules/aws-kms-ssm"
  
  environment = var.environment
  secrets = {
    SUPABASE_URL               = module.supabase.project_url
    SUPABASE_ANON_KEY          = module.supabase.anon_key
    SUPABASE_SERVICE_ROLE_KEY  = module.supabase.service_role_key
    OPENROUTER_API_KEY         = var.openrouter_api_key
    TELEGRAM_BOT_TOKEN         = var.telegram_bot_token
    GITHUB_APP_ID              = var.github_app_id
    GITHUB_PRIVATE_KEY         = var.github_app_private_key
    GITHUB_WEBHOOK_SECRET      = var.github_webhook_secret
    GITHUB_CLIENT_ID           = var.github_client_id
    GITHUB_CLIENT_SECRET       = var.github_client_secret
  }
}

module "aws_lambda" {
  source = "../../modules/aws-lambda"
  
  aws_region   = var.aws_region
  environment  = var.environment
}

module "cloudflare" {
  source = "../../modules/cloudflare"
  
  cloudflare_zone_name   = var.cloudflare_zone_name
  cloudflare_account_id  = var.cloudflare_account_id
  cloudflare_api_token   = var.cloudflare_api_token
}

module "github" {
  source = "../../modules/github"
  
  environment = var.environment
}

module "s3_state" {
  source = "../../modules/s3-state"
  
  aws_account_id = var.aws_account_id
}