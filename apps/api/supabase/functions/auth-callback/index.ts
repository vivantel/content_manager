import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")!;
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")!;
const GITLAB_CLIENT_ID = Deno.env.get("GITLAB_CLIENT_ID")!;
const GITLAB_CLIENT_SECRET = Deno.env.get("GITLAB_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchGitHubOrgs(accessToken: string): Promise<string[]> {
  const response = await fetch('https://api.github.com/user/orgs', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  
  if (!response.ok) return [];
  
  const orgs = await response.json();
  return orgs.map((org: any) => org.login);
}

async function fetchGitLabGroups(accessToken: string): Promise<string[]> {
  const response = await fetch('https://gitlab.com/api/v4/groups', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) return [];
  
  const groups = await response.json();
  return groups.map((group: any) => group.path);
}

async function syncUserOrganizations(userId: string, provider: 'github' | 'gitlab', accessToken: string) {
  let orgNames: string[] = [];
  
  if (provider === 'github') {
    orgNames = await fetchGitHubOrgs(accessToken);
  } else {
    orgNames = await fetchGitLabGroups(accessToken);
  }

  for (const orgName of orgNames) {
    // Find or create organization
    let { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgName.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
      .single();

    if (!org) {
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        })
        .select()
        .single();

      if (createError) {
        console.error(`Failed to create org ${orgName}:`, createError);
        continue;
      }
      org = newOrg;
    }

    // Upsert membership
    await supabase
      .from('memberships')
      .upsert({
        user_id: userId,
        organization_id: org.id,
        role: 'member',
      }, {
        onConflict: 'user_id,organization_id',
      });
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { user_id, provider, access_token } = await req.json();

    if (!user_id || !provider || !access_token) {
      return new Response('Missing required fields', { status: 400 });
    }

    await syncUserOrganizations(user_id, provider, access_token);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});