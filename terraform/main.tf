terraform {
  required_version = ">= 1.5"

  backend "s3" {
    bucket         = "vivascribe-terraform-state-${var.aws_account_id}-eu-north-1"
    key            = "vivascribe/infrastructure/terraform.tfstate"
    region         = "eu-north-1"
    use_lockfile   = true
    object_lock    = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}