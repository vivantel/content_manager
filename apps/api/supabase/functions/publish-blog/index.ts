import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PublishRequest {
  contentPieceId: string;
  channelId: string;
  config: Record<string, unknown>;
}

async function publishToGitHubPages(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const repo = config.github_pages_repo as string;
  const branch = (config.branch as string) || 'main';
  const path = (config.path as string) || 'content';
  const [owner, repoName] = repo.split('/');

  const filename = `${path}/${Date.now()}.md`;
  const commitMessage = `Add content: ${filename}`;

  // Create or update file via GitHub API
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: btoa(content),
        branch,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Pages publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  const url = `https://${owner}.github.io/${repoName}/${filename.replace('.md', '.html')}`;
  
  return { url, externalId: data.content.sha };
}

async function publishToGenericWebhook(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const webhookUrl = config.webhook_url as string;
  const secret = config.webhook_secret as string;

  const payload = {
    content,
    timestamp: new Date().toISOString(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)));
    headers['X-Signature-256'] = `sha256=${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook publish failed: ${response.status}`);
  }

  return { url: webhookUrl, externalId: Date.now().toString() };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { contentPieceId, channelId, config }: PublishRequest = await req.json();

    // Fetch content piece
    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .select('id, title, content, content_html, front_matter, organization_id')
      .eq('id', contentPieceId)
      .single();

    if (pieceError || !piece) {
      return new Response('Content piece not found', { status: 404 });
    }

    // Build full content with front matter
    let fullContent = '';
    if (piece.front_matter && Object.keys(piece.front_matter).length > 0) {
      fullContent += '---\n';
      for (const [key, value] of Object.entries(piece.front_matter)) {
        fullContent += `${key}: ${JSON.stringify(value)}\n`;
      }
      fullContent += '---\n\n';
    }
    fullContent += piece.content;

    let result: { url: string; externalId: string };

    const channelType = config.type as string;
    
    if (channelType === 'github_pages') {
      result = await publishToGitHubPages(fullContent, config);
    } else if (channelType === 'webhook') {
      result = await publishToGenericWebhook(fullContent, config);
    } else {
      throw new Error(`Unsupported blog channel type: ${channelType}`);
    }

    // Update publish job
    await supabase
      .from('publish_jobs')
      .update({
        status: 'success',
        external_id: result.externalId,
        external_url: result.url,
        completed_at: new Date().toISOString(),
      })
      .eq('content_piece_id', contentPieceId)
      .eq('channel_id', channelId);

    // Update content piece
    await supabase
      .from('content_pieces')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', contentPieceId);

    return new Response(JSON.stringify({ success: true, url: result.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog publish error:', error);
    
    // Update publish job with error
    const body = await req.json().catch(() => ({}));
    await supabase
      .from('publish_jobs')
      .update({
        status: 'failed',
        last_error: String(error),
        attempt: (body as any).attempt ? (body as any).attempt + 1 : 1,
      })
      .eq('content_piece_id', body.contentPieceId)
      .eq('channel_id', body.channelId);

    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});