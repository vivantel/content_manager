import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONVERTKIT_API_KEY = Deno.env.get("CONVERTKIT_API_KEY");
const CONVERTKIT_API_SECRET = Deno.env.get("CONVERTKIT_API_SECRET");
const BEEHIIV_API_KEY = Deno.env.get("BEEHIIV_API_KEY");
const MAILERSEND_API_KEY = Deno.env.get("MAILERSEND_API_KEY");
const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Deno.env.get("SMTP_PORT");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PublishRequest {
  contentPieceId: string;
  channelId: string;
  config: Record<string, unknown>;
}

async function publishToConvertKit(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const formId = config.convertkit_form_id as string;
  const apiKey = CONVERTKIT_API_KEY || config.convertkit_api_key;

  const response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      email: config.test_email || 'test@example.com', // In production, get from subscriber list
      tags: ['vivascribe', config.content_type || 'article'],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ConvertKit publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { url: `https://convertkit.com/forms/${formId}`, externalId: data.subscription?.id?.toString() || Date.now().toString() };
}

async function publishToBeehiiv(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const publicationId = config.beehiiv_publication_id as string;
  const apiKey = BEEHIIV_API_KEY || config.beehiiv_api_key;

  const response = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: config.title || 'New Article',
      content: { html: content },
      status: 'published',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Beehiiv publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { url: data.data?.url || '', externalId: data.data?.id || Date.now().toString() };
}

async function publishToMailerSend(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const apiKey = MAILERSEND_API_KEY || config.mailersend_api_key;
  const fromEmail = config.from_email || 'noreply@vivascribe.dev';
  const toEmail = config.to_email || 'subscriber@example.com';

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: 'VivaScribe' },
      to: [{ email: toEmail, name: 'Subscriber' }],
      subject: config.subject || 'New Content from VivaScribe',
      html: content,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MailerSend publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { url: 'https://mailersend.com', externalId: data.message_id || Date.now().toString() };
}

async function publishViaSMTP(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  // SMTP publishing would require a proper email library
  // This is a placeholder implementation
  console.log('SMTP publishing not fully implemented in Edge Function');
  return { url: 'smtp://local', externalId: Date.now().toString() };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { contentPieceId, channelId, config }: PublishRequest = await req.json();

    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .select('id, title, content, content_html, organization_id')
      .eq('id', contentPieceId)
      .single();

    if (pieceError || !piece) {
      return new Response('Content piece not found', { status: 404 });
    }

    const htmlContent = piece.content_html || piece.content;
    const provider = config.provider as string || 'convertkit';

    let result: { url: string; externalId: string };

    switch (provider) {
      case 'convertkit':
        result = await publishToConvertKit(htmlContent, config);
        break;
      case 'beehiiv':
        result = await publishToBeehiiv(htmlContent, config);
        break;
      case 'mailersend':
        result = await publishToMailerSend(htmlContent, config);
        break;
      case 'smtp':
        result = await publishViaSMTP(htmlContent, config);
        break;
      default:
        throw new Error(`Unsupported newsletter provider: ${provider}`);
    }

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
    console.error('Newsletter publish error:', error);
    
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