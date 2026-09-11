# GitHub Repository Settings

resource "github_repository" "main" {
  name        = "content_manager"
  description = "VivaScribe - Content management ecosystem on top of git repos"
  visibility  = "private"
  has_issues  = true
  has_projects = false
  has_wiki    = false
  
  # Branch protection for master
  branch_protection_rule {
    pattern = "master"
    required_status_checks = {
      contexts = ["CI"]
    }
    required_pull_request_reviews = {
      required_approving_review_count = 1
    }
    enforce_admins = false
    restrictions = {
      users = []
      teams = []
    }
  }
}

# GitHub Branch Protection for Master

resource "github_branch_protection" "master" {
  repository_id = github_repository.main.id
  pattern       = "master"
  
  required_status_checks = {
    contexts = ["CI"]
  }
  
  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews = true
    require_code_owner_reviews = false
  }
  
  enforce_admins = false
}

# GitHub Actions OIDC Subject Claim Customization

resource "github_actions_oidc_subject_claim_customization_template" "terraform" {
  repository_id = github_repository.main.id
  
  include_claim_keys = ["repository", "ref", "sha"]
}

# Cover Repository (git-poller)

resource "github_repository" "cover" {
  name        = "git-poller"
  description = "Public cover repo for GitHub Actions polling (unlimited free minutes)"
  visibility  = "public"
  has_issues  = false
  has_projects = false
  has_wiki    = false
  auto_init   = true
}

# Cover Repo Branch Protection

resource "github_branch_protection" "cover_main" {
  repository_id = github_repository.cover.id
  pattern       = "master"
  
  required_status_checks {
    contexts = []
  }
}

output "main_repo_id" {
  value = github_repository.main.id
}

output "cover_repo_id" {
  value = github_repository.cover.id
}