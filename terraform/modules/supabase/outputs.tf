output "project_id" {
  value = supabase_project.main.id
}

output "project_ref" {
  value = supabase_project.main.id
}

output "project_url" {
  value = supabase_project.main.url
}

output "service_role_key" {
  value = supabase_project.main.service_role_key
  sensitive = true
}

output "anon_key" {
  value = supabase_project.main.anon_key
  sensitive = true
}

output "function_names" {
  value = [for k, v in supabase_edge_function.functions : k]
}