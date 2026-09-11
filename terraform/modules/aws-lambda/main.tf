# Lambda Function

resource "aws_lambda_function" "main" {
  function_name = "vivascribe-api"
  runtime       = "nodejs20.x"
  architecture  = "arm64"
  handler       = "dist/index.handler"
  timeout       = 15
  memory_size   = 512
  
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  
  role    = aws_iam_role.lambda.arn
  runtime = "nodejs20.x"
  
  environment {
    variables = {
      NODE_ENV = "production"
      # Secrets injected at runtime from SSM
    }
  }
  
  depends_on = [aws_iam_role_policy.lambda]
}

# Lambda Function URL (public HTTPS endpoint)

resource "aws_lambda_function_url" "main" {
  function_name = aws_lambda_function.main.function_name
  auth_type     = "NONE"
  cors {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
  }
}

# IAM Role for Lambda

resource "aws_iam_role" "lambda" {
  name = "vivascribe-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# IAM Policy for Lambda

resource "aws_iam_role_policy" "lambda" {
  name = "vivascribe-lambda-policy"
  role = aws_iam_role.lambda.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/vivascribe-api:*"
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "kms:Decrypt"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/vivascribe/*",
          "arn:aws:kms:${var.aws_region}:*:key/*"
        ]
      }
    ]
  })
}

# CloudWatch Log Group (3-day retention)

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/vivascribe-api"
  retention_in_days = 3
  
  lifecycle {
    create_before_destroy = true
  }
}

# Archive Lambda code for deployment

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../../../apps/api/dist"
  output_path = "${path.module}/../../../apps/api/function.zip"
  
  # Only create archive if dist exists
  depends_on = [null_resource.build_lambda]
}

# Null resource to ensure build exists

resource "null_resource" "build_lambda" {
  provisioner "local-exec" {
    command = "cd ${path.module}/../../../apps/api && npm run build 2>/dev/null || true"
  }
}

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