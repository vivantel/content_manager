export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

export const api = {
  prefix: '/api',
  version: 'v1',
  timeout: 30000,
} as const;

export const pagination = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const content = {
  maxTitleLength: 200,
  maxContentLength: 100000,
  autoSaveInterval: 30000,
} as const;

export const llm = {
  defaultModel: 'gpt-4o-mini',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 60000,
} as const;

export const github = {
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  actionsCoverRepo: process.env.GITHUB_ACTIONS_COVER_REPO ?? 'vivantel/git-poller',
} as const;

export const supabase = {
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
} as const;

export const vercel = {
  url: process.env.VERCEL_URL,
  token: process.env.VERCEL_TOKEN,
} as const;

export const openrouter = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseUrl: 'https://openrouter.ai/api/v1',
} as const;

export const nvidia = {
  apiKey: process.env.NVIDIA_API_KEY,
  baseUrl: 'https://integrate.api.nvidia.com/v1',
} as const;

export function validateEnv(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}