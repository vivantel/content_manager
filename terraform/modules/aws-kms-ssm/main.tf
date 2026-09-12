# AWS KMS + SSM Module

resource "aws_kms_alias" "secrets" {
  name          = "alias/vivascribe-secrets"
  target_key_id = "alias/aws/ssm"
}

resource "aws_ssm_parameter" "secrets" {
  for_each = var.secrets
  name  = "/vivascribe/${each.key}"
  type  = "SecureString"
  value = each.value
  key_id = aws_kms_alias.secrets.arn
  tags = {
    Project     = "vivascribe"
    Environment = var.environment
  }
}

output "kms_key_arn" {
  value = aws_kms_alias.secrets.arn
}

output "parameter_names" {
  value = [for k, v in aws_ssm_parameter.secrets : k]
}