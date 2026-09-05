import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface RawEvent {
  id: string;
  source: "github" | "gitlab";
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    url: string;
    owner: { login: string; avatar_url: string };
  };
  actor: { id: number; login: string; avatar_url: string };
}

interface NormalizedEvent {
  id: string;
  source: "github" | "gitlab";
  event_type: string;
  action: string;
  repository_id: number;
  repository_name: string;
  repository_url: string;
  actor_id: number;
  actor_login: string;
  actor_avatar: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  processed_at: string;
}

interface EnrichedEvent extends NormalizedEvent {
  content_type: "commit" | "pr" | "issue" | "release" | "push" | "unknown";
  title: string;
  description: string;
  url: string;
  tags: string[];
  priority: "low" | "medium" | "high";
  language?: string;
  file_paths?: string[];
}

interface Draft {
  id?: string;
  event_id: string;
  title: string;
  content: string;
  content_type: string;
  status: "draft" | "published" | "archived";
  metadata: Record<string, unknown>;
  created_at: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizeEvent(raw: RawEvent): NormalizedEvent {
  const githubEventMap: Record<string, { action: string; type: string }> = {
    PushEvent: { action: "pushed", type: "push" },
    PullRequestEvent: { action: raw.payload.action as string, type: "pr" },
    IssuesEvent: { action: raw.payload.action as string, type: "issue" },
    ReleaseEvent: { action: raw.payload.action as string, type: "release" },
    CreateEvent: { action: "created", type: raw.payload.ref_type as string },
    DeleteEvent: { action: "deleted", type: raw.payload.ref_type as string },
  };

  const gitlabEventMap: Record<string, { action: string; type: string }> = {
    push: { action: "pushed", type: "push" },
    merge_request: { action: raw.payload.object_attributes?.action as string, type: "pr" },
    issue: { action: raw.payload.object_attributes?.action as string, type: "issue" },
    tag_push: { action: "tagged", type: "release" },
  };

  const eventMap = raw.source === "github" ? githubEventMap : gitlabEventMap;
  const mapped = eventMap[raw.type] || { action: raw.type, type: "unknown" };

  return {
    id: raw.id,
    source: raw.source,
    event_type: mapped.type,
    action: mapped.action,
    repository_id: raw.repository.id,
    repository_name: raw.repository.name,
    repository_url: raw.repository.url,
    actor_id: raw.actor.id,
    actor_login: raw.actor.login,
    actor_avatar: raw.actor.avatar_url,
    payload: raw.payload,
    occurred_at: raw.timestamp,
    processed_at: new Date().toISOString(),
  };
}

function enrichEvent(normalized: NormalizedEvent): EnrichedEvent {
  const payload = normalized.payload as Record<string, unknown>;
  let content_type: EnrichedEvent["content_type"] = "unknown";
  let title = "";
  let description = "";
  let url = normalized.repository_url;
  const tags: string[] = [normalized.source, normalized.event_type];
  let priority: EnrichedEvent["priority"] = "low";
  let language: string | undefined;
  let file_paths: string[] | undefined;

  switch (normalized.event_type) {
    case "push": {
      content_type = "push";
      const commits = (payload.commits as Array<Record<string, unknown>>) || [];
      const headCommit = commits[0];
      title = `Push to ${normalized.repository_name}: ${(headCommit?.message as string)?.split("\n")[0] || "new commits"}`;
      description = commits.map((c) => `- ${(c.message as string)?.split("\n")[0]}`).join("\n");
      url = `${normalized.repository_url}/compare/${payload.before}...${payload.after}`;
      file_paths = commits.flatMap((c) => [
        ...((c.added as string[]) || []),
        ...((c.modified as string[]) || []),
        ...((c.removed as string[]) || []),
      ]);
      priority = commits.length > 10 ? "high" : "medium";
      break;
    }
    case "pr": {
      content_type = "pr";
      const pr = payload.pull_request || payload.merge_request || payload;
      title = `PR ${normalized.action}: ${pr.title}`;
      description = pr.body as string || "";
      url = pr.html_url as string || pr.url as string || normalized.repository_url;
      tags.push(`#${pr.number}`);
      priority = (pr.draft as boolean) ? "low" : "high";
      break;
    }
    case "issue": {
      content_type = "issue";
      const issue = payload.issue || payload;
      title = `Issue ${normalized.action}: ${issue.title}`;
      description = issue.body as string || "";
      url = issue.html_url as string || issue.url as string || normalized.repository_url;
      tags.push(`#${issue.number}`);
      priority = (issue.labels as Array<Record<string, unknown>>)?.some((l) => (l.name as string)?.includes("bug")) ? "high" : "medium";
      break;
    }
    case "release": {
      content_type = "release";
      const release = payload.release || payload;
      title = `Release ${normalized.action}: ${release.tag_name || release.name}`;
      description = release.body as string || "";
      url = release.html_url as string || release.url as string || normalized.repository_url;
      priority = "high";
      break;
    }
    default: {
      title = `${normalized.event_type} ${normalized.action} in ${normalized.repository_name}`;
      description = JSON.stringify(payload).slice(0, 500);
    }
  }

  if (file_paths?.length) {
    const extensions = file_paths.map((f) => f.split(".").pop()).filter(Boolean);
    language = [...new Set(extensions)][0];
  }

  return {
    ...normalized,
    content_type,
    title,
    description,
    url,
    tags,
    priority,
    language,
    file_paths,
  };
}

function filterEvent(enriched: EnrichedEvent): boolean {
  if (enriched.content_type === "unknown") return false;
  if (enriched.priority === "low" && enriched.event_type === "push") return false;
  if (enriched.actor_login.includes("bot") || enriched.actor_login.includes("[bot]")) return false;
  return true;
}

async function createDraft(supabase: ReturnType<typeof createClient>, enriched: EnrichedEvent): Promise<Draft> {
  const draft: Omit<Draft, "id"> = {
    event_id: enriched.id,
    title: enriched.title,
    content: `# ${enriched.title}\n\n${enriched.description}\n\n---\n**Source:** ${enriched.source} | **Type:** ${enriched.content_type} | **Priority:** ${enriched.priority}\n**Repository:** [${enriched.repository_name}](${enriched.repository_url})\n**Author:** @${enriched.actor_login}\n**Link:** ${enriched.url}`,
    content_type: enriched.content_type,
    status: "draft",
    metadata: {
      source: enriched.source,
      repository_id: enriched.repository_id,
      actor_id: enriched.actor_id,
      tags: enriched.tags,
      priority: enriched.priority,
      language: enriched.language,
      file_paths: enriched.file_paths,
      url: enriched.url,
      occurred_at: enriched.occurred_at,
    },
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("content_drafts").insert(draft).select().single();
  if (error) throw new Error(`Failed to create draft: ${error.message}`);
  return data as Draft;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const events: RawEvent[] = Array.isArray(body.events) ? body.events : [body];

    const results = [];
    for (const rawEvent of events) {
      const normalized = normalizeEvent(rawEvent);
      const enriched = enrichEvent(normalized);

      if (!filterEvent(enriched)) {
        results.push({ event_id: rawEvent.id, status: "filtered", reason: "Failed filters" });
        continue;
      }

      const draft = await createDraft(supabase, enriched);
      results.push({ event_id: rawEvent.id, status: "created", draft_id: draft.id });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Event processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
