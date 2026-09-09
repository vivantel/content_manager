import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITLAB_WEBHOOK_SECRET = Deno.env.get("GITLAB_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function verifyGitLabSignature(payload: string, token: string): boolean {
  return token === GITLAB_WEBHOOK_SECRET;
}

interface WebhookEvent {
  provider: 'github' | 'gitlab';
  event_type: string;
  provider_event_id: string;
  payload: unknown;
  signature: string;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const token = req.headers.get("x-gitlab-token") || "";
  const eventType = req.headers.get("x-gitlab-event") || "";

  const rawBody = await req.text();

  // Verify token
  if (!verifyGitLabSignature(rawBody, token)) {
    console.error("Invalid GitLab webhook token", { eventType });
    return new Response("Invalid token", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("Invalid JSON payload", { error: e });
    return new Response("Invalid JSON", { status: 400 });
  }

  // Store webhook event
  const webhookEvent: WebhookEvent = {
    provider: "gitlab",
    event_type: eventType,
    provider_event_id: String(Date.now()),
    payload,
    signature: token,
    processed: false,
    processed_at: null,
    error: null,
  };

  const { data: insertedEvent, error: insertError } = await supabase
    .from("webhook_events")
    .insert(webhookEvent)
    .select()
    .single();

  if (insertError) {
    console.error("Failed to store webhook event", { error: insertError });
    return new Response("Internal error", { status: 500 });
  }

  // Process event asynchronously
  processEvent(insertedEvent.id, eventType, payload).catch(console.error);

  return new Response(JSON.stringify({ success: true, eventId: insertedEvent.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function processEvent(eventId: string, eventType: string, payload: unknown) {
  try {
    const supportedEvents = ["push", "merge_request", "tag_push", "release"];
    if (!supportedEvents.includes(eventType)) {
      await markEventProcessed(eventId, `Unsupported event type: ${eventType}`);
      return;
    }

    const project = (payload as any).project;
    if (!project?.id) {
      await markEventProcessed(eventId, "No project info in payload");
      return;
    }

    // Find repository in our database
    const { data: repository } = await supabase
      .from("repositories")
      .select("id, organization_id, provider_repo_id")
      .eq("provider_repo_id", String(project.id))
      .eq("provider", "gitlab")
      .single();

    if (!repository) {
      await markEventProcessed(eventId, `Repository not configured: ${project.path_with_namespace}`);
      return;
    }

    // Check if this event type is enabled for this repo
    const { data: repoConfig } = await supabase
      .from("repositories")
      .select("event_sources")
      .eq("id", repository.id)
      .single();

    const eventSources = repoConfig?.event_sources || {};
    const eventTypeMap: Record<string, string> = {
      push: "commits",
      merge_request: "merged_prs",
      tag_push: "tags",
      release: "tags",
    };

    const sourceKey = eventTypeMap[eventType];
    if (!sourceKey || !eventSources[sourceKey]) {
      await markEventProcessed(eventId, `Event source ${sourceKey} not enabled for repo`);
      return;
    }

    // Create RepoEvent record
    const repoEvent = {
      repository_id: repository.id,
      type: eventType === "tag_push" ? "tag" : 
            eventType === "release" ? "release" :
            eventType === "merge_request" ? "pull_request_merged" : "push",
      provider_event_id: String((payload as any).object_attributes?.id || Date.now()),
      payload,
    };

    const { data: repoEventData, error: repoEventError } = await supabase
      .from("repo_events")
      .insert(repoEvent)
      .select()
      .single();

    if (repoEventError) {
      console.error("Failed to create repo event", { error: repoEventError });
      await markEventProcessed(eventId, repoEventError.message);
      return;
    }

    await enrichAndQueueGeneration(repository, repoEventData, eventType, payload);
    await markEventProcessed(eventId);
  } catch (error) {
    console.error("Error processing event", { eventId, error });
    await markEventProcessed(eventId, String(error));
  }
}

async function enrichAndQueueGeneration(
  repository: { id: string; organization_id: string },
  repoEvent: { id: string },
  eventType: string,
  payload: unknown
) {
  const { error } = await supabase
    .from("repo_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", repoEvent.id);

  if (error) {
    console.error("Failed to mark repo event processed", { error });
  }
}

async function markEventProcessed(eventId: string, error?: string) {
  const { error: updateError } = await supabase
    .from("webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      error: error || null,
    })
    .eq("id", eventId);

  if (updateError) {
    console.error("Failed to update webhook event", { error: updateError });
  }
}