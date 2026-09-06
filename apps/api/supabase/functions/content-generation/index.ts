import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
const GITHUB_MODELS_API_KEY = Deno.env.get("GITHUB_MODELS_API_KEY");
const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface GenerationRequest {
  repoEventId: string;
  contentType: string;
  promptVersionId?: string;
}

interface PromptVersion {
  id: string;
  template: string;
  variables: string[];
  contentType?: string;
}

interface RepoEvent {
  id: string;
  repositoryId: string;
  type: string;
  payload: Record<string, unknown>;
  repository: {
    id: string;
    name: string;
    fullName: string;
    provider: string;
    defaultBranch: string;
  };
}

async function fetchPromptVersion(promptVersionId: string): Promise<PromptVersion | null> {
  const { data } = await supabase
    .from('prompt_versions')
    .select('id, template, variables, content_type')
    .eq('id', promptVersionId)
    .eq('is_active', true)
    .single();
  return data;
}

async function fetchDefaultPrompt(contentType: string): Promise<PromptVersion | null> {
  const { data } = await supabase
    .from('prompt_versions')
    .select('id, template, variables, content_type')
    .eq('type', 'content_type')
    .eq('content_type', contentType)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function fetchSystemPrompt(): Promise<string | null> {
  const { data } = await supabase
    .from('prompt_versions')
    .select('template')
    .eq('type', 'system')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  return data?.template || null;
}

async function fetchRepoEvent(repoEventId: string): Promise<RepoEvent | null> {
  const { data } = await supabase
    .from('repo_events')
    .select(`
      id,
      repository_id,
      type,
      payload,
      repositories (
        id,
        name,
        full_name,
        provider,
        default_branch
      )
    `)
    .eq('id', repoEventId)
    .single();
  
  if (!data) return null;
  
  return {
    ...data,
    repository: data.repositories,
  } as RepoEvent;
}

function buildPrompt(
  systemPrompt: string | null,
  contentTypePrompt: PromptVersion,
  repoEvent: RepoEvent
): string {
  const variables: Record<string, string> = {
    repo_name: repoEvent.repository.name,
    repo_full_name: repoEvent.repository.fullName,
    event_type: repoEvent.type,
  };

  // Extract relevant data from payload based on event type
  const payload = repoEvent.payload as Record<string, unknown>;
  
  if (repoEvent.type === 'push' || repoEvent.type === 'pull_request_merged') {
    const commits = (payload.commits as Array<Record<string, unknown>>) || [];
    variables.commits = commits
      .map(c => `- ${(c.message as string)?.split('\n')[0]}`)
      .join('\n');
  }
  
  if (repoEvent.type === 'pull_request_merged') {
    const pr = payload.pull_request as Record<string, unknown> || {};
    variables.pr_title = pr.title as string || '';
    variables.pr_body = pr.body as string || '';
    variables.pr_number = String(pr.number || '');
    variables.pr_url = pr.html_url as string || '';
  }
  
  if (repoEvent.type === 'release' || repoEvent.type === 'tag') {
    const release = payload.release as Record<string, unknown> || {};
    variables.tag_name = release.tag_name as string || '';
    variables.release_name = release.name as string || '';
    variables.release_body = release.body as string || '';
  }

  let prompt = '';
  if (systemPrompt) {
    prompt += `${systemPrompt}\n\n`;
  }
  
  prompt += contentTypePrompt.template;
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return prompt;
}

async function callLLM(
  prompt: string,
  contentType: string
): Promise<{ content: string; tokens: { prompt: number; completion: number; total: number }; model: string; provider: string }> {
  const providers = [
    { name: 'github_models', key: GITHUB_MODELS_API_KEY, baseUrl: 'https://models.inference.ai.azure.com', model: 'gpt-4o-mini' },
    { name: 'openrouter', key: OPENROUTER_API_KEY, baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.1-8b-instruct:free' },
    { name: 'nvidia', key: NVIDIA_API_KEY, baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'nvidia/nemotron-3-ultra' },
    { name: 'google_ai', key: GOOGLE_AI_API_KEY, baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' },
  ];

  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      let response: Response;
      let responseData: any;

      if (provider.name === 'google_ai') {
        response = await fetch(
          `${provider.baseUrl}/models/${provider.model}:generateContent?key=${provider.key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
            }),
          }
        );
      } else {
        response = await fetch(
          `${provider.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${provider.key}`,
              ...(provider.name === 'openrouter' ? {
                'HTTP-Referer': 'https://vivascribe.dev',
                'X-Title': 'VivaScribe',
              } : {}),
            },
            body: JSON.stringify({
              model: provider.model,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4000,
              temperature: 0.7,
            }),
          }
        );
      }

      if (!response.ok) {
        console.log(`${provider.name} failed: ${response.status}`);
        continue;
      }

      responseData = await response.json();

      let content: string;
      let tokens = { prompt: 0, completion: 0, total: 0 };

      if (provider.name === 'google_ai') {
        content = responseData.candidates[0]?.content?.parts[0]?.text || '';
        tokens = {
          prompt: responseData.usageMetadata?.promptTokenCount || 0,
          completion: responseData.usageMetadata?.candidatesTokenCount || 0,
          total: responseData.usageMetadata?.totalTokenCount || 0,
        };
      } else {
        content = responseData.choices[0]?.message?.content || '';
        tokens = {
          prompt: responseData.usage?.prompt_tokens || 0,
          completion: responseData.usage?.completion_tokens || 0,
          total: responseData.usage?.total_tokens || 0,
        };
      }

      return { content, tokens, model: responseData.model || provider.model, provider: provider.name };
    } catch (error) {
      console.log(`${provider.name} error:`, error);
      continue;
    }
  }

  throw new Error('All LLM providers failed');
}

async function createContentPiece(
  repoEvent: RepoEvent,
  contentType: string,
  content: string,
  promptVersionId?: string
) {
  const title = generateTitle(repoEvent, contentType);
  const slug = generateSlug(title);

  const { data, error } = await supabase
    .from('content_pieces')
    .insert({
      organization_id: repoEvent.repository.organization_id,
      repository_id: repoEvent.repository.id,
      title,
      slug,
      content_type: contentType,
      status: 'draft',
      content,
      target_channels: [],
      prompt_version_id: promptVersionId,
      triggering_event_id: repoEvent.id,
      metadata: {
        repo_event_type: repoEvent.type,
        generated_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function generateTitle(repoEvent: RepoEvent, contentType: string): string {
  const payload = repoEvent.payload as Record<string, unknown>;
  
  switch (contentType) {
    case 'release_notes':
      return `Release Notes: ${repoEvent.repository.name}`;
    case 'technical_article':
      if (repoEvent.type === 'pull_request_merged') {
        const pr = payload.pull_request as Record<string, unknown> || {};
        return `Technical Deep Dive: ${pr.title}`;
      }
      return `Technical Article: ${repoEvent.repository.name} Updates`;
    case 'product_announcement':
      if (repoEvent.type === 'release') {
        const release = payload.release as Record<string, unknown> || {};
        return `Announcing ${release.name || release.tag_name}`;
      }
      return `Product Update: ${repoEvent.repository.name}`;
    case 'tutorial':
      return `Tutorial: Working with ${repoEvent.repository.name}`;
    default:
      return `${contentType}: ${repoEvent.repository.name}`;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { repoEventId, contentType, promptVersionId }: GenerationRequest = await req.json();

    if (!repoEventId || !contentType) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Fetch repo event
    const repoEvent = await fetchRepoEvent(repoEventId);
    if (!repoEvent) {
      return new Response('Repo event not found', { status: 404 });
    }

    // Fetch prompts
    let contentTypePrompt: PromptVersion | null = null;
    if (promptVersionId) {
      contentTypePrompt = await fetchPromptVersion(promptVersionId);
    }
    
    if (!contentTypePrompt) {
      contentTypePrompt = await fetchDefaultPrompt(contentType);
    }
    
    if (!contentTypePrompt) {
      return new Response('No prompt found for content type', { status: 400 });
    }

    const systemPrompt = await fetchSystemPrompt();
    const prompt = buildPrompt(systemPrompt, contentTypePrompt, repoEvent);

    // Call LLM
    const result = await callLLM(prompt, contentType);

    // Create content piece
    const contentPiece = await createContentPiece(repoEvent, contentType, result.content, contentTypePrompt.id);

    // Log usage
    await supabase.from('llm_usage').insert({
      organization_id: repoEvent.repository.organization_id,
      provider: result.provider,
      model: result.model,
      content_type: contentType,
      prompt_tokens: result.tokens.prompt,
      completion_tokens: result.tokens.completion,
      total_tokens: result.tokens.total,
      content_piece_id: contentPiece.id,
    });

    return new Response(JSON.stringify({ success: true, contentPieceId: contentPiece.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});