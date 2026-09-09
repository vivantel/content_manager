import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AnalyticsEvent {
  organizationId: string;
  event: string;
  properties: Record<string, unknown>;
  userId?: string;
  contentPieceId?: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const events: AnalyticsEvent[] = Array.isArray(body.events) ? body.events : [body];

    const results = [];
    for (const event of events) {
      const { data, error } = await supabase
        .from('analytics_events')
        .insert({
          organization_id: event.organizationId,
          event: event.event,
          properties: event.properties,
          user_id: event.userId,
          content_piece_id: event.contentPieceId,
        })
        .select()
        .single();

      if (error) {
        results.push({ event: event.event, status: 'error', error: error.message });
      } else {
        results.push({ event: event.event, status: 'success', id: data.id });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analytics track error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});