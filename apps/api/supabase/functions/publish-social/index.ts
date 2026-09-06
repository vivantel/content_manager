import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWITTER_API_KEY = Deno.env.get("TWITTER_API_KEY");
const TWITTER_API_SECRET = Deno.env.get("TWITTER_API_SECRET");
const TWITTER_ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN");
const TWITTER_ACCESS_SECRET = Deno.env.get("TWITTER_ACCESS_SECRET");
const LINKEDIN_ACCESS_TOKEN = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
const MASTODON_ACCESS_TOKEN = Deno.env.get("MASTODON_ACCESS_TOKEN");
const MASTODON_INSTANCE = Deno.env.get("MASTODON_INSTANCE");
const BLUESKY_HANDLE = Deno.env.get("BLUESKY_HANDLE");
const BLUESKY_APP_PASSWORD = Deno.env.get("BLUESKY_APP_PASSWORD");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PublishRequest {
  contentPieceId: string;
  channelId: string;
  config: Record<string, unknown>;
}

function truncateForTwitter(text: string, maxLength = 280): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

async function publishToTwitter(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  // Twitter API v2 - requires OAuth 1.0a or OAuth 2.0 Bearer token
  // Using OAuth 2.0 Bearer token for simplicity
  const tweet = truncateForTwitter(content);
  
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TWITTER_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: tweet }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { 
    url: `https://twitter.com/user/status/${data.data.id}`, 
    externalId: data.data.id 
  };
}

async function publishToLinkedIn(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${config.linkedin_person_urn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { 
    url: `https://linkedin.com/feed/update/${data.id}`, 
    externalId: data.id 
  };
}

async function publishToMastodon(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  const instance = MASTODON_INSTANCE || config.mastodon_instance;
  const response = await fetch(`https://${instance}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MASTODON_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: content,
      visibility: config.mastodon_visibility || 'public',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mastodon publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { 
    url: data.url, 
    externalId: data.id 
  };
}

async function publishToBluesky(
  content: string,
  config: Record<string, unknown>
): Promise<{ url: string; externalId: string }> {
  // Bluesky AT Protocol - simplified implementation
  // In production, use @atproto/api package
  const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BLUESKY_APP_PASSWORD}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo: BLUESKY_HANDLE,
      collection: 'app.bsky.feed.post',
      record: {
        text: content,
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bluesky publish failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { 
    url: `https://bsky.app/profile/${BLUESKY_HANDLE}/post/${data.uri.split('/').pop()}`, 
    externalId: data.uri 
  };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { contentPieceId, channelId, config }: PublishRequest = await req.json();

    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .select('id, title, content, organization_id')
      .eq('id', contentPieceId)
      .single();

    if (pieceError || !piece) {
      return new Response('Content piece not found', { status: 404 });
    }

    // Create social media friendly content (shorter, with link)
    const socialContent = `${piece.title}\n\n${piece.content.substring(0, 200)}...`;

    const platforms = (config.platforms as string[]) || ['twitter'];
    const results: Array<{ platform: string; url: string; externalId: string }> = [];

    for (const platform of platforms) {
      try {
        let result: { url: string; externalId: string };
        
        switch (platform) {
          case 'twitter':
            result = await publishToTwitter(socialContent, config);
            break;
          case 'linkedin':
            result = await publishToLinkedIn(socialContent, config);
            break;
          case 'mastodon':
            result = await publishToMastodon(socialContent, config);
            break;
          case 'bluesky':
            result = await publishToBluesky(socialContent, config);
            break;
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }
        
        results.push({ platform, ...result });
      } catch (error) {
        console.error(`Failed to publish to ${platform}:`, error);
        // Continue with other platforms
      }
    }

    if (results.length === 0) {
      throw new Error('All social platforms failed');
    }

    // Update publish job
    await supabase
      .from('publish_jobs')
      .update({
        status: 'success',
        external_id: results[0].externalId,
        external_url: results[0].url,
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

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Social publish error:', error);
    
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