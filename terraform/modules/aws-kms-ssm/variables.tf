variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "secrets" {
  description = "Map of secret names to values"
  type        = map(string)
  default     = {}
}