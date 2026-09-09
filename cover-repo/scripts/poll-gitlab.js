import { Gitlab } from '@gitbeaker/rest';
import { createHmac } from 'crypto';

const VIVASCRIBE_API_URL = process.env.VIVASCRIBE_API_URL;
const VIVASCRIBE_API_KEY = process.env.VIVASCRIBE_API_KEY;
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const SINCE = process.env.SINCE ? new Date(process.env.SINCE) : new Date(Date.now() - 24 * 60 * 60 * 1000);
const REPO_OVERRIDE = process.env.REPO_OVERRIDE;

if (!VIVASCRIBE_API_URL || !VIVASCRIBE_API_KEY) {
  console.error('Missing VIVASCRIBE_API_URL or VIVASCRIBE_API_KEY');
  process.exit(1);
}

if (!GITLAB_TOKEN) {
  console.error('Missing GITLAB_TOKEN');
  process.exit(1);
}

const gitlab = new Gitlab({ token: GITLAB_TOKEN });

async function fetchConfiguredRepos() {
  const response = await fetch(`${VIVASCRIBE_API_URL}/api/v1/repositories`, {
    headers: {
      'Authorization': `Bearer ${VIVASCRIBE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.items.filter((repo: any) => repo.provider === 'gitlab' && repo.isActive);
}

async function pollGitLabRepo(repo: any, since: Date) {
  const projectId = repo.providerRepoId;
  const events: any[] = [];

  try {
    // Fetch commits since last sync
    if (repo.eventSources?.commits) {
      const commits = await gitlab.Commits.all(projectId, {
        since: since.toISOString(),
        per_page: 100,
      });

      for (const commit of commits) {
        events.push({
          type: 'push',
          providerEventId: commit.id,
          payload: {
            project: { id: projectId, path_with_namespace: repo.fullName },
            commits: commits.map(c => ({
              id: c.id,
              title: c.title,
              author_name: c.author_name,
              created_at: c.created_at,
              web_url: c.web_url,
            })),
            ref: `refs/heads/${repo.defaultBranch}`,
            before: '0000000000000000000000000000000000000000',
            after: commit.id,
          },
        });
      }
    }

    // Fetch merged MRs since last sync
    if (repo.eventSources?.merged_prs) {
      const mrs = await gitlab.MergeRequests.all(projectId, {
        state: 'merged',
        updated_after: since.toISOString(),
        per_page: 100,
      });

      for (const mr of mrs) {
        events.push({
          type: 'pull_request_merged',
          providerEventId: String(mr.iid),
          payload: {
            project: { id: projectId, path_with_namespace: repo.fullName },
            object_attributes: {
              iid: mr.iid,
              title: mr.title,
              description: mr.description,
              state: mr.state,
              merged: mr.merged,
              merged_at: mr.merged_at,
              target_branch: mr.target_branch,
              source_branch: mr.source_branch,
              author: { username: mr.author?.username },
              web_url: mr.web_url,
            },
          },
        });
      }
    }

    // Fetch tags since last sync
    if (repo.eventSources?.tags) {
      const tags = await gitlab.Tags.all(projectId, { per_page: 100 });

      for (const tag of tags) {
        // Would need to check tag commit date
        events.push({
          type: 'tag',
          providerEventId: tag.name,
          payload: {
            project: { id: projectId, path_with_namespace: repo.fullName },
            ref: `refs/tags/${tag.name}`,
            ref_type: 'tag',
          },
        });
      }

      // Fetch releases
      const releases = await gitlab.Releases.all(projectId, { per_page: 100 });

      for (const release of releases) {
        if (new Date(release.released_at) > since) {
          events.push({
            type: 'release',
            providerEventId: String(release.tag_name),
            payload: {
              project: { id: projectId, path_with_namespace: repo.fullName },
              release: {
                tag_name: release.tag_name,
                name: release.name,
                description: release.description,
                released_at: release.released_at,
              },
            },
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error polling repo ${repo.fullName}:`, error);
  }

  return events;
}

async function main() {
  console.log(`Polling GitLab repositories since ${SINCE.toISOString()}`);

  const repos = await fetchConfiguredRepos();
  console.log(`Found ${repos.length} GitLab repositories to poll`);

  let allEvents: any[] = [];

  for (const repo of repos) {
    if (REPO_OVERRIDE && repo.fullName !== REPO_OVERRIDE) {
      continue;
    }

    console.log(`Polling ${repo.fullName}...`);
    const events = await pollGitLabRepo(repo, SINCE);
    console.log(`Found ${events.length} events for ${repo.fullName}`);
    allEvents.push(...events.map(e => ({ ...e, repositoryId: repo.id })));
  }

  // Store events for dispatch
  const fs = await import('fs');
  const eventsFile = '.gitlab-events.json';
  fs.writeFileSync(eventsFile, JSON.stringify(allEvents, null, 2));
  console.log(`Stored ${allEvents.length} events to ${eventsFile}`);
}

main().catch(console.error);