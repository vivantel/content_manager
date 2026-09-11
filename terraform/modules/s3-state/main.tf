# S3 State Bucket Reference

# This bucket is created manually before Terraform init
# See docs/skills/bootstrap-terraform.md for creation steps

data "aws_s3_bucket" "state" {
  bucket = "vivascribe-terraform-state-${var.aws_account_id}-eu-north-1"
}

output "bucket_name" {
  value = data.aws_s3_bucket.state.id
}

output "bucket_arn" {
  value = data.aws_s3_bucket.state.arn
}