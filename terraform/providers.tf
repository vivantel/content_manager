provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "vivascribe"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "github" {
  owner = "vivantel"
}