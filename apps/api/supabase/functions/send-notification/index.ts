import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
const TEAMS_WEBHOOK_URL = Deno.env.get("TEAMS_WEBHOOK_URL");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface NotificationRequest {
  organizationId: string;
  event: string;
  payload: Record<string, unknown>;
  userIds?: string[];
}

interface NotificationTemplate {
  subject: string;
  body: string;
}

const templates: Record<string, NotificationTemplate> = {
  draft_created: {
    subject: 'New Draft Created: {{title}}',
    body: 'A new draft "{{title}}" has been created for {{repository}}. Content type: {{contentType}}.',
  },
  review_requested: {
    subject: 'Review Requested: {{title}}',
    body: 'You have been requested to review "{{title}}". Please review at: {{url}}',
  },
  publish_scheduled: {
    subject: 'Content Scheduled for Publishing: {{title}}',
    body: 'Content "{{title}}" has been scheduled for publishing on {{scheduledAt}}.',
  },
  publish_due: {
    subject: 'Publishing Due: {{title}}',
    body: 'Content "{{title}}" is due for publishing. Please review and publish.',
  },
  publish_failed: {
    subject: 'Publishing Failed: {{title}}',
    body: 'Publishing failed for "{{title}}". Error: {{error}}. Please check and retry.',
  },
  review_completed: {
    subject: 'Review Completed: {{title}}',
    body: 'Review for "{{title}}" has been completed with action: {{action}}.',
  },
};

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] || '');
  });
}

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'VivaScribe <notifications@vivascribe.dev>',
      to: [to],
      subject,
      html: body.replace(/\n/g, '<br>'),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email send failed: ${response.status} ${error}`);
  }
}

async function sendSlack(message: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('SLACK_WEBHOOK_URL not configured, skipping Slack');
    return;
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    throw new Error(`Slack send failed: ${response.status}`);
  }
}

async function sendDiscord(message: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('DISCORD_WEBHOOK_URL not configured, skipping Discord');
    return;
  }

  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });

  if (!response.ok) {
    throw new Error(`Discord send failed: ${response.status}`);
  }
}

async function sendTeams(message: string): Promise<void> {
  if (!TEAMS_WEBHOOK_URL) {
    console.log('TEAMS_WEBHOOK_URL not configured, skipping Teams');
    return;
  }

  const response = await fetch(TEAMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    throw new Error(`Teams send failed: ${response.status}`);
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { organizationId, event, payload, userIds }: NotificationRequest = await req.json();

    if (!organizationId || !event) {
      return new Response('Missing required fields', { status: 400 });
    }

    const template = templates[event];
    if (!template) {
      return new Response(`Unknown event type: ${event}`, { status: 400 });
    }

    const subject = renderTemplate(template.subject, payload);
    const body = renderTemplate(template.body, payload);

    // Get user notification preferences
    let query = supabase
      .from('notification_preferences')
      .select('user_id, channel, enabled')
      .eq('organization_id', organizationId);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: preferences, error: prefError } = await query;

    if (prefError) {
      console.error('Failed to fetch preferences:', prefError);
    }

    // Get user emails for email notifications
    let userIdsToNotify = userIds;
    if (!userIdsToNotify && preferences) {
      userIdsToNotify = preferences.map(p => p.user_id);
    }

    const { data: users } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', userIdsToNotify || []);

    const results = [];

    // Send notifications based on preferences
    for (const user of users || []) {
      const userPrefs = preferences?.filter(p => p.user_id === user.id) || [];
      
      for (const pref of userPrefs) {
        if (!pref.enabled) continue;

        try {
          let result: { success: boolean; channel: string };

          switch (pref.channel) {
            case 'email':
              if (user.email) {
                await sendEmail(user.email, subject, body);
                result = { success: true, channel: 'email' };
              } else {
                result = { success: false, channel: 'email' };
              }
              break;
            case 'slack':
              await sendSlack(body);
              result = { success: true, channel: 'slack' };
              break;
            case 'discord':
              await sendDiscord(body);
              result = { success: true, channel: 'discord' };
              break;
            case 'teams':
              await sendTeams(body);
              result = { success: true, channel: 'teams' };
              break;
            case 'in_app':
              // Store in-app notification
              await supabase.from('notifications').insert({
                organization_id: organizationId,
                user_id: user.id,
                event,
                channel: 'in_app',
                payload: { subject, body, ...payload },
                status: 'sent',
                sent_at: new Date().toISOString(),
              });
              result = { success: true, channel: 'in_app' };
              break;
            case 'webhook':
              // Custom webhook would be configured per org
              result = { success: true, channel: 'webhook' };
              break;
            default:
              result = { success: false, channel: pref.channel };
          }

          results.push(result);
        } catch (error) {
          results.push({ success: false, channel: pref.channel, error: String(error) });
          
          // Log failed notification
          await supabase.from('notifications').insert({
            organization_id: organizationId,
            user_id: user.id,
            event,
            channel: pref.channel,
            payload: { subject, body, ...payload },
            status: 'failed',
            error: String(error),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});