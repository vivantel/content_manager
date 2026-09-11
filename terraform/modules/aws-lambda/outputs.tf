output "function_name" {
  value = aws_lambda_function.main.function_name
}

output "function_arn" {
  value = aws_lambda_function.main.arn
}

output "function_url" {
  value = aws_lambda_function_url.main.function_url
}

output "function_url_host" {
  value = replace(aws_lambda_function_url.main.function_url, "https://", "")
}