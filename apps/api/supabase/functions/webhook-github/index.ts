import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verify } from "https://deno.land/std@0.177.0/crypto/hmac.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_WEBHOOK_SECRET = Deno.env.get("GITHUB_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(GITHUB_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  
  const sigBytes = hexToBytes(signature.replace("sha256=", ""));
  const payloadBytes = encoder.encode(payload);
  
  return await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
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
  const startTime = Date.now();
  
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("x-hub-signature-256") || "";
  const eventType = req.headers.get("x-github-event") || "";
  const deliveryId = req.headers.get("x-github-delivery") || "";

  const rawBody = await req.text();

  // Verify signature
  const isValid = await verifySignature(rawBody, signature);
  if (!isValid) {
    console.error("Invalid webhook signature", { deliveryId, eventType });
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("Invalid JSON payload", { deliveryId, error: e });
    return new Response("Invalid JSON", { status: 400 });
  }

  // Store webhook event
  const webhookEvent: WebhookEvent = {
    provider: "github",
    event_type: eventType,
    provider_event_id: deliveryId,
    payload,
    signature,
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

  // Process event asynchronously (don't block response)
  processEvent(insertedEvent.id, eventType, payload).catch(console.error);

  return new Response(JSON.stringify({ success: true, eventId: insertedEvent.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function processEvent(eventId: string, eventType: string, payload: unknown) {
  try {
    // Only process events we care about
    const supportedEvents = ["push", "pull_request", "release", "create"];
    if (!supportedEvents.includes(eventType)) {
      await markEventProcessed(eventId, `Unsupported event type: ${eventType}`);
      return;
    }

    // Extract repository info from payload
    const repo = (payload as any).repository;
    if (!repo?.full_name) {
      await markEventProcessed(eventId, "No repository info in payload");
      return;
    }

    // Find repository in our database
    const { data: repository } = await supabase
      .from("repositories")
      .select("id, organization_id, provider_repo_id")
      .eq("provider_repo_id", String(repo.id))
      .eq("provider", "github")
      .single();

    if (!repository) {
      await markEventProcessed(eventId, `Repository not configured: ${repo.full_name}`);
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
      pull_request: "merged_prs",
      release: "tags",
      create: "tags",
    };

    const sourceKey = eventTypeMap[eventType];
    if (!sourceKey || !eventSources[sourceKey]) {
      await markEventProcessed(eventId, `Event source ${sourceKey} not enabled for repo`);
      return;
    }

    // Create RepoEvent record
    const repoEvent = {
      repository_id: repository.id,
      type: eventType === "create" && (payload as any).ref_type === "tag" ? "tag" : 
            eventType === "release" ? "release" :
            eventType === "pull_request" ? "pull_request_merged" : "push",
      provider_event_id: String((payload as any).number || (payload as any).head_commit?.id || Date.now()),
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

    // Enrich event based on type
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
  // For now, just mark as ready for generation
  // In a full implementation, this would:
  // 1. Fetch full PR diff, commit messages, changelog content
  // 2. Determine content types to generate
  // 3. Queue AI generation job
  
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