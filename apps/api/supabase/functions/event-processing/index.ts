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
  diff?: string;
  diff_summary?: DiffSummary;
  changelog?: string;
  commits?: CommitInfo[];
  pr_metadata?: PRMetadata;
}

interface DiffSummary {
  files_changed: number;
  additions: number;
  deletions: number;
  file_types: string[];
  has_tests: boolean;
  has_docs: boolean;
  has_config: boolean;
}

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  additions?: number;
  deletions?: number;
  files?: string[];
}

interface PRMetadata {
  number: number;
  state: string;
  draft: boolean;
  merged: boolean;
  base_branch: string;
  head_branch: string;
  author: string;
  reviewers: string[];
  labels: string[];
  commits_count: number;
  changed_files: number;
  additions: number;
  deletions: number;
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

interface GitHubAppConfig {
  app_id: string;
  private_key: string;
  installation_id?: string;
}

interface GitLabConfig {
  access_token: string;
  api_url?: string;
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

async function getGitHubAppToken(config: GitHubAppConfig, repoOwner: string, repoName: string): Promise<string> {
  const jwt = await generateJWT(config.app_id, config.private_key);
  
  let installationId = config.installation_id;
  if (!installationId) {
    const installationsResp = await fetch("https://api.github.com/app/installations", {
      headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json" },
    });
    const installations = await installationsResp.json();
    const installation = installations.find((i: any) => 
      i.account.login.toLowerCase() === repoOwner.toLowerCase()
    );
    installationId = installation?.id;
  }
  
  if (!installationId) {
    throw new Error("No GitHub App installation found for repository");
  }
  
  const tokenResp = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    { method: "POST", headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json" } }
  );
  const tokenData = await tokenResp.json();
  return tokenData.token;
}

async function generateJWT(appId: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 600, iss: appId };
  
  const encoder = new TextEncoder();
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .trim();
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(`${encodedHeader}.${encodedPayload}`));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

async function fetchGitHubPRDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ diff: string; summary: DiffSummary }> {
  const diffResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.diff" },
    }
  );
  const diff = await diffResp.text();
  
  const filesResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    }
  );
  const files = await filesResp.json();
  
  const summary = computeDiffSummary(files);
  return { diff, summary };
}

async function fetchGitLabMRDiff(
  config: GitLabConfig,
  projectId: string | number,
  mrIid: number
): Promise<{ diff: string; summary: DiffSummary }> {
  const apiUrl = config.api_url || "https://gitlab.com/api/v4";
  
  const changesResp = await fetch(
    `${apiUrl}/projects/${projectId}/merge_requests/${mrIid}/changes`,
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  );
  const changesData = await changesResp.json();
  
  const diff = changesData.changes
    .map((c: any) => `diff --git a/${c.old_path} b/${c.new_path}\n${c.diff}`)
    .join("\n\n");
  
  const summary = computeDiffSummary(changesData.changes.map((c: any) => ({
    filename: c.new_path || c.old_path,
    additions: (c.diff.match(/\n\+/g) || []).length,
    deletions: (c.diff.match(/\n-/g) || []).length,
    status: c.new_file ? "added" : c.deleted_file ? "removed" : "modified",
  })));
  
  return { diff, summary };
}

async function fetchGitHubCommitComparison(
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<{ commits: CommitInfo[]; diff: string; summary: DiffSummary }> {
  const compareResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  );
  const compareData = await compareResp.json();
  
  const commits: CommitInfo[] = compareData.commits.map((c: any) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
    additions: c.stats?.additions,
    deletions: c.stats?.deletions,
    files: c.files?.map((f: any) => f.filename),
  }));
  
  const diffResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.diff" } }
  );
  const diff = await diffResp.text();
  
  const summary = computeDiffSummary(compareData.files || []);
  
  return { commits, diff, summary };
}

async function fetchGitLabCommits(
  config: GitLabConfig,
  projectId: string | number,
  since?: string,
  until?: string,
  ref?: string
): Promise<CommitInfo[]> {
  const apiUrl = config.api_url || "https://gitlab.com/api/v4";
  const params = new URLSearchParams();
  if (since) params.set("since", since);
  if (until) params.set("until", until);
  if (ref) params.set("ref_name", ref);
  params.set("per_page", "100");
  
  const resp = await fetch(
    `${apiUrl}/projects/${projectId}/repository/commits?${params}`,
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  );
  const commits = await resp.json();
  
  return commits.map((c: any) => ({
    sha: c.id,
    message: c.title,
    author: c.author_name,
    date: c.created_at,
    url: c.web_url,
  }));
}

async function fetchChangelogContent(
  config: GitHubAppConfig | GitLabConfig,
  source: "github" | "gitlab",
  owner: string,
  repo: string,
  tag?: string
): Promise<string | null> {
  const commonPaths = [
    "CHANGELOG.md",
    "CHANGELOG.rst",
    "CHANGES.md",
    "HISTORY.md",
    "RELEASES.md",
    "docs/CHANGELOG.md",
    "docs/changelog.md",
  ];
  
  if (source === "github") {
    const token = "app_id" in config ? await getGitHubAppToken(config as GitHubAppConfig, owner, repo) : "";
    if (!token) return null;
    
    for (const path of commonPaths) {
      try {
        const resp = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}${tag ? `?ref=${tag}` : ""}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.content) {
            const content = atob(data.content.replace(/\n/g, ""));
            return extractRelevantChangelog(content, tag);
          }
        }
      } catch {
        continue;
      }
    }
  } else {
    const gitlabConfig = config as GitLabConfig;
    const apiUrl = gitlabConfig.api_url || "https://gitlab.com/api/v4";
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    
    for (const path of commonPaths) {
      try {
        const resp = await fetch(
          `${apiUrl}/projects/${projectId}/repository/files/${encodeURIComponent(path)}${tag ? `?ref=${tag}` : ""}`,
          { headers: { Authorization: `Bearer ${gitlabConfig.access_token}` } }
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.content) {
            const content = atob(data.content);
            return extractRelevantChangelog(content, tag);
          }
        }
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

function extractRelevantChangelog(content: string, tag?: string): string {
  const lines = content.split("\n");
  if (!tag) return lines.slice(0, 100).join("\n");
  
  const tagIndex = lines.findIndex(l => l.includes(tag.replace(/^v/, "")));
  if (tagIndex === -1) return lines.slice(0, 100).join("\n");
  
  let endIndex = lines.length;
  for (let i = tagIndex + 1; i < lines.length; i++) {
    if (lines[i].match(/^#+\s+\d/)) {
      endIndex = i;
      break;
    }
  }
  
  return lines.slice(tagIndex, endIndex).join("\n");
}

function computeDiffSummary(files: Array<{ filename: string; additions: number; deletions: number; status?: string }>): DiffSummary {
  const fileTypes = new Set<string>();
  let hasTests = false;
  let hasDocs = false;
  let hasConfig = false;
  let totalAdditions = 0;
  let totalDeletions = 0;
  
  for (const file of files) {
    totalAdditions += file.additions || 0;
    totalDeletions += file.deletions || 0;
    
    const ext = file.filename.split(".").pop()?.toLowerCase();
    if (ext) fileTypes.add(ext);
    
    const lowerPath = file.filename.toLowerCase();
    if (lowerPath.includes("test") || lowerPath.includes("spec") || lowerPath.includes("__tests__")) {
      hasTests = true;
    }
    if (lowerPath.includes("readme") || lowerPath.includes("doc") || lowerPath.endsWith(".md")) {
      hasDocs = true;
    }
    if (
      lowerPath.includes("config") ||
      lowerPath.includes(".json") ||
      lowerPath.includes(".yaml") ||
      lowerPath.includes(".yml") ||
      lowerPath.includes(".toml") ||
      lowerPath.includes("dockerfile") ||
      lowerPath.includes(".env")
    ) {
      hasConfig = true;
    }
  }
  
  return {
    files_changed: files.length,
    additions: totalAdditions,
    deletions: totalDeletions,
    file_types: Array.from(fileTypes),
    has_tests: hasTests,
    has_docs: hasDocs,
    has_config: hasConfig,
  };
}

async function enrichWithGitHubData(
  normalized: NormalizedEvent,
  githubConfig: GitHubAppConfig
): Promise<Partial<EnrichedEvent>> {
  const payload = normalized.payload as Record<string, unknown>;
  const repoUrl = new URL(normalized.repository_url);
  const [, owner, repo] = repoUrl.pathname.split("/").filter(Boolean);
  
  const token = await getGitHubAppToken(githubConfig, owner, repo);
  const enrichment: Partial<EnrichedEvent> = {};
  
  switch (normalized.event_type) {
    case "pr": {
      const pr = payload.pull_request || payload;
      const prNumber = pr.number as number;
      
      if (["opened", "reopened", "synchronize", "closed"].includes(normalized.action)) {
        const { diff, summary } = await fetchGitHubPRDiff(token, owner, repo, prNumber);
        enrichment.diff = diff.slice(0, 50000);
        enrichment.diff_summary = summary;
        
        enrichment.pr_metadata = {
          number: prNumber,
          state: pr.state as string,
          draft: pr.draft as boolean,
          merged: pr.merged as boolean,
          base_branch: pr.base?.ref as string,
          head_branch: pr.head?.ref as string,
          author: pr.user?.login as string,
          reviewers: (pr.requested_reviewers as any[])?.map(r => r.login) || [],
          labels: (pr.labels as any[])?.map(l => l.name) || [],
          commits_count: pr.commits as number,
          changed_files: pr.changed_files as number,
          additions: pr.additions as number,
          deletions: pr.deletions as number,
        };
        
        if (normalized.action === "closed" && pr.merged) {
          const tag = pr.base?.ref;
          enrichment.changelog = await fetchChangelogContent(githubConfig, "github", owner, repo, tag);
        }
      }
      break;
    }
    case "push": {
      const before = payload.before as string;
      const after = payload.after as string;
      const ref = payload.ref as string;
      
      if (before && after && before !== "0000000000000000000000000000000000000000") {
        const { commits, diff, summary } = await fetchGitHubCommitComparison(
          token,
          owner,
          repo,
          before,
          after
        );
        enrichment.commits = commits;
        enrichment.diff = diff.slice(0, 50000);
        enrichment.diff_summary = summary;
        
        if (ref?.startsWith("refs/tags/")) {
          const tag = ref.replace("refs/tags/", "");
          enrichment.changelog = await fetchChangelogContent(githubConfig, "github", owner, repo, tag);
        }
      }
      break;
    }
    case "release": {
      const release = payload.release || payload;
      const tag = release.tag_name as string;
      enrichment.changelog = await fetchChangelogContent(githubConfig, "github", owner, repo, tag);
      break;
    }
  }
  
  return enrichment;
}

async function enrichWithGitLabData(
  normalized: NormalizedEvent,
  gitlabConfig: GitLabConfig
): Promise<Partial<EnrichedEvent>> {
  const payload = normalized.payload as Record<string, unknown>;
  const projectId = normalized.repository_id;
  const enrichment: Partial<EnrichedEvent> = {};
  
  switch (normalized.event_type) {
    case "pr": {
      const mr = payload.merge_request || payload.object_attributes;
      const mrIid = mr.iid as number;
      
      if (["opened", "reopened", "update", "closed", "merged"].includes(normalized.action)) {
        const { diff, summary } = await fetchGitLabMRDiff(gitlabConfig, projectId, mrIid);
        enrichment.diff = diff.slice(0, 50000);
        enrichment.diff_summary = summary;
        
        enrichment.pr_metadata = {
          number: mrIid,
          state: mr.state as string,
          draft: mr.draft as boolean,
          merged: mr.merged as boolean,
          base_branch: mr.target_branch as string,
          head_branch: mr.source_branch as string,
          author: mr.author?.username as string,
          reviewers: (mr.reviewers as any[])?.map(r => r.username) || [],
          labels: (mr.labels as any[])?.map(l => l.title) || [],
          commits_count: mr.commits_count as number,
          changed_files: mr.changes_count as number,
          additions: summary.additions,
          deletions: summary.deletions,
        };
        
        if (["closed", "merged"].includes(normalized.action) && mr.merged) {
          enrichment.changelog = await fetchChangelogContent(
            gitlabConfig,
            "gitlab",
            normalized.repository.owner.login,
            normalized.repository.name,
            mr.target_branch
          );
        }
      }
      break;
    }
    case "push": {
      const ref = payload.ref as string;
      const before = payload.before as string;
      const after = payload.after as string;
      
      if (ref?.startsWith("refs/tags/") && after && after !== "0000000000000000000000000000000000000000") {
        const tag = ref.replace("refs/tags/", "");
        const commits = await fetchGitLabCommits(gitlabConfig, projectId, undefined, undefined, tag);
        enrichment.commits = commits.slice(0, 50);
        
        enrichment.changelog = await fetchChangelogContent(
          gitlabConfig,
          "gitlab",
          normalized.repository.owner.login,
          normalized.repository.name,
          tag
        );
      } else if (before && after && before !== "0000000000000000000000000000000000000000") {
        const commits = await fetchGitLabCommits(gitlabConfig, projectId, undefined, undefined, payload.ref?.replace("refs/heads/", ""));
        enrichment.commits = commits.filter(c => 
          c.sha !== before && c.sha !== after
        ).slice(0, 50);
      }
      break;
    }
    case "release": {
      const release = payload.release || payload;
      const tag = release.tag_name as string;
      enrichment.changelog = await fetchChangelogContent(
        gitlabConfig,
        "gitlab",
        normalized.repository.owner.login,
        normalized.repository.name,
        tag
      );
      break;
    }
  }
  
  return enrichment;
}

async function enrichmentOrchestrator(
  normalized: NormalizedEvent,
  githubConfig?: GitHubAppConfig,
  gitlabConfig?: GitLabConfig
): Promise<EnrichedEvent> {
  let enriched = enrichEvent(normalized);
  
  if (normalized.source === "github" && githubConfig) {
    const githubEnrichment = await enrichWithGitHubData(normalized, githubConfig);
    enriched = { ...enriched, ...githubEnrichment };
  } else if (normalized.source === "gitlab" && gitlabConfig) {
    const gitlabEnrichment = await enrichWithGitLabData(normalized, gitlabConfig);
    enriched = { ...enriched, ...gitlabEnrichment };
  }
  
  if (enriched.diff_summary) {
    enriched.tags.push(`files:${enriched.diff_summary.files_changed}`);
    enriched.tags.push(`+${enriched.diff_summary.additions}/-${enriched.diff_summary.deletions}`);
    if (enriched.diff_summary.has_tests) enriched.tags.push("has-tests");
    if (enriched.diff_summary.has_docs) enriched.tags.push("has-docs");
    if (enriched.diff_summary.has_config) enriched.tags.push("has-config");
    
    if (enriched.diff_summary.files_changed > 20 || enriched.diff_summary.additions > 1000) {
      enriched.priority = "high";
    }
  }
  
  if (enriched.pr_metadata) {
    enriched.tags.push(`pr:#${enriched.pr_metadata.number}`);
    enriched.tags.push(`base:${enriched.pr_metadata.base_branch}`);
    if (enriched.pr_metadata.draft) enriched.tags.push("draft");
    if (enriched.pr_metadata.merged) enriched.tags.push("merged");
  }
  
  return enriched;
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

function buildEnrichedContent(enriched: EnrichedEvent): string {
  let content = `# ${enriched.title}\n\n${enriched.description}\n\n`;
  
  if (enriched.diff_summary) {
    content += `## Diff Summary\n`;
    content += `- **Files changed:** ${enriched.diff_summary.files_changed}\n`;
    content += `- **Additions:** +${enriched.diff_summary.additions}\n`;
    content += `- **Deletions:** -${enriched.diff_summary.deletions}\n`;
    content += `- **File types:** ${enriched.diff_summary.file_types.join(", ") || "none"}\n`;
    content += `- **Has tests:** ${enriched.diff_summary.has_tests ? "✅" : "❌"}\n`;
    content += `- **Has docs:** ${enriched.diff_summary.has_docs ? "✅" : "❌"}\n`;
    content += `- **Has config:** ${enriched.diff_summary.has_config ? "✅" : "❌"}\n\n`;
  }
  
  if (enriched.pr_metadata) {
    content += `## PR Metadata\n`;
    content += `- **Number:** #${enriched.pr_metadata.number}\n`;
    content += `- **State:** ${enriched.pr_metadata.state}\n`;
    content += `- **Draft:** ${enriched.pr_metadata.draft ? "Yes" : "No"}\n`;
    content += `- **Merged:** ${enriched.pr_metadata.merged ? "Yes" : "No"}\n`;
    content += `- **Base branch:** ${enriched.pr_metadata.base_branch}\n`;
    content += `- **Head branch:** ${enriched.pr_metadata.head_branch}\n`;
    content += `- **Author:** @${enriched.pr_metadata.author}\n`;
    content += `- **Reviewers:** ${enriched.pr_metadata.reviewers.length ? enriched.pr_metadata.reviewers.map(r => `@${r}`).join(", ") : "none"}\n`;
    content += `- **Labels:** ${enriched.pr_metadata.labels.join(", ") || "none"}\n`;
    content += `- **Commits:** ${enriched.pr_metadata.commits_count}\n`;
    content += `- **Changed files:** ${enriched.pr_metadata.changed_files}\n\n`;
  }
  
  if (enriched.commits && enriched.commits.length > 0) {
    content += `## Commits (${enriched.commits.length})\n`;
    for (const commit of enriched.commits.slice(0, 20)) {
      content += `- \`${commit.sha.slice(0, 7)}\` ${commit.message.split("\n")[0]} by @${commit.author} (${new Date(commit.date).toLocaleDateString()})\n`;
    }
    if (enriched.commits.length > 20) {
      content += `... and ${enriched.commits.length - 20} more commits\n`;
    }
    content += "\n";
  }
  
  if (enriched.changelog) {
    content += `## Changelog\n${enriched.changelog.slice(0, 10000)}\n\n`;
  }
  
  if (enriched.diff) {
    content += `## Diff\n\`\`\`diff\n${enriched.diff.slice(0, 15000)}\n\`\`\`\n\n`;
  }
  
  content += `---\n**Source:** ${enriched.source} | **Type:** ${enriched.content_type} | **Priority:** ${enriched.priority}\n`;
  content += `**Repository:** [${enriched.repository_name}](${enriched.repository_url})\n`;
  content += `**Author:** @${enriched.actor_login}\n`;
  content += `**Link:** ${enriched.url}`;
  
  return content;
}

async function createDraft(supabase: ReturnType<typeof createClient>, enriched: EnrichedEvent): Promise<Draft> {
  const content = buildEnrichedContent(enriched);
  
  const draft: Omit<Draft, "id"> = {
    event_id: enriched.id,
    title: enriched.title,
    content,
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
      diff_summary: enriched.diff_summary,
      pr_metadata: enriched.pr_metadata,
      commits_count: enriched.commits?.length,
      has_changelog: !!enriched.changelog,
      has_diff: !!enriched.diff,
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
    
    const githubConfig: GitHubAppConfig | undefined = Deno.env.get("GITHUB_APP_ID") ? {
      app_id: Deno.env.get("GITHUB_APP_ID")!,
      private_key: Deno.env.get("GITHUB_APP_PRIVATE_KEY")!,
      installation_id: Deno.env.get("GITHUB_APP_INSTALLATION_ID") || undefined,
    } : undefined;
    
    const gitlabConfig: GitLabConfig | undefined = Deno.env.get("GITLAB_ACCESS_TOKEN") ? {
      access_token: Deno.env.get("GITLAB_ACCESS_TOKEN")!,
      api_url: Deno.env.get("GITLAB_API_URL") || undefined,
    } : undefined;

    const results = [];
    for (const rawEvent of events) {
      const normalized = normalizeEvent(rawEvent);
      const enriched = await enrichmentOrchestrator(normalized, githubConfig, gitlabConfig);

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
