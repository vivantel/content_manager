import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PublishRequest {
  contentPieceId: string;
  channelId: string;
  config: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { contentPieceId, channelId, config }: PublishRequest = await req.json();

    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .select('id, title, content, content_html, front_matter, organization_id')
      .eq('id', contentPieceId)
      .single();

    if (pieceError || !piece) {
      return new Response('Content piece not found', { status: 404 });
    }

    const webhookUrl = config.webhook_url as string;
    const secret = config.webhook_secret as string;
    const method = (config.method as string) || 'POST';
    const headers = (config.headers as Record<string, string>) || {};
    const template = config.template as string;

    // Prepare payload
    let payload: Record<string, unknown> = {
      content_piece_id: piece.id,
      title: piece.title,
      content: piece.content,
      content_html: piece.content_html,
      front_matter: piece.front_matter,
      published_at: new Date().toISOString(),
    };

    // Apply custom template if provided
    if (template) {
      try {
        payload = JSON.parse(template.replace('{{content}}', JSON.stringify(payload)));
      } catch {
        // Use default payload if template invalid
      }
    }

    // Add signature if secret provided
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'VivaScribe-Webhook/1.0',
      ...headers,
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
      requestHeaders['X-Signature-256'] = `sha256=${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }

    const response = await fetch(webhookUrl, {
      method,
      headers: requestHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Webhook publish failed: ${response.status} ${error}`);
    }

    const responseData = await response.json().catch(() => ({}));

    await supabase
      .from('publish_jobs')
      .update({
        status: 'success',
        external_id: responseData.id || Date.now().toString(),
        external_url: webhookUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('content_piece_id', contentPieceId)
      .eq('channel_id', channelId);

    await supabase
      .from('content_pieces')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', contentPieceId);

    return new Response(JSON.stringify({ success: true, url: webhookUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook publish error:', error);
    
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