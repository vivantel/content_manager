output "kms_key_arn" {
  value = aws_kms_alias.secrets.arn
}

output "parameter_names" {
  value = [for k, v in aws_ssm_parameter.secrets : k]
}