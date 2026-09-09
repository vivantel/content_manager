import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VIVASCRIBE_WEBHOOK_SECRET = Deno.env.get("VIVASCRIBE_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify authorization
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${VIVASCRIBE_WEBHOOK_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { repositoryIds?: string[]; since?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { repositoryIds, since } = body;
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch repositories to poll
  let query = supabase
    .from("repositories")
    .select("id, provider, provider_repo_id, event_sources, organization_id")
    .eq("is_active", true);

  if (repositoryIds && repositoryIds.length > 0) {
    query = query.in("id", repositoryIds);
  }

  const { data: repositories, error: repoError } = await query;

  if (repoError) {
    console.error("Failed to fetch repositories", { error: repoError });
    return new Response("Failed to fetch repositories", { status: 500 });
  }

  let totalEventsProcessed = 0;

  for (const repo of repositories || []) {
    try {
      const eventsProcessed = await pollRepository(repo, sinceDate);
      totalEventsProcessed += eventsProcessed;
    } catch (error) {
      console.error(`Error polling repo ${repo.id}`, { error });
    }
  }

  return new Response(
    JSON.stringify({ success: true, eventsProcessed: totalEventsProcessed }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});

async function pollRepository(
  repo: { id: string; provider: string; provider_repo_id: string; event_sources: Record<string, boolean>; organization_id: string },
  sinceDate: Date
): Promise<number> {
  let eventsProcessed = 0;

  try {
    if (repo.provider === "github") {
      eventsProcessed = await pollGitHubRepo(repo, sinceDate);
    } else if (repo.provider === "gitlab") {
      eventsProcessed = await pollGitLabRepo(repo, sinceDate);
    }
  } catch (error) {
    console.error(`Error polling repository ${repo.id}`, { error });
  }

  // Update sync state
  await supabase
    .from("repo_sync_state")
    .upsert({
      repository_id: repo.id,
      last_synced_at: new Date().toISOString(),
      last_synced_sha: null, // Would track specific SHA in full implementation
    });

  return eventsProcessed;
}

async function pollGitHubRepo(
  repo: { id: string; provider_repo_id: string; event_sources: Record<string, boolean> },
  sinceDate: Date
): Promise<number> {
  // This would use GitHub App installation token to call GitHub API
  // For now, return 0 - full implementation requires GitHub App setup
  console.log(`Would poll GitHub repo ${repo.provider_repo_id} since ${sinceDate.toISOString()}`);
  return 0;
}

async function pollGitLabRepo(
  repo: { id: string; provider_repo_id: string; event_sources: Record<string, boolean> },
  sinceDate: Date
): Promise<number> {
  // This would use GitLab token to call GitLab API
  console.log(`Would poll GitLab repo ${repo.provider_repo_id} since ${sinceDate.toISOString()}`);
  return 0;
}