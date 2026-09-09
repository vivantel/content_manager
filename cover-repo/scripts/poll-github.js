import { Octokit } from '@octokit/rest';
import { createHmac } from 'crypto';

const VIVASCRIBE_API_URL = process.env.VIVASCRIBE_API_URL;
const VIVASCRIBE_API_KEY = process.env.VIVASCRIBE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SINCE = process.env.SINCE ? new Date(process.env.SINCE) : new Date(Date.now() - 24 * 60 * 60 * 1000);
const REPO_OVERRIDE = process.env.REPO_OVERRIDE;

if (!VIVASCRIBE_API_URL || !VIVASCRIBE_API_KEY) {
  console.error('Missing VIVASCRIBE_API_URL or VIVASCRIBE_API_KEY');
  process.exit(1);
}

if (!GITHUB_TOKEN) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

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
  return data.data.items.filter((repo: any) => repo.provider === 'github' && repo.isActive);
}

async function pollGitHubRepo(repo: any, since: Date) {
  const [owner, repoName] = repo.fullName.split('/');
  const events: any[] = [];

  try {
    // Fetch commits since last sync
    if (repo.eventSources?.commits) {
      const commits = await octokit.rest.repos.listCommits({
        owner,
        repo: repoName,
        since: since.toISOString(),
        per_page: 100,
      });

      for (const commit of commits.data) {
        events.push({
          type: 'push',
          providerEventId: commit.sha,
          payload: {
            repository: { id: repo.providerRepoId, full_name: repo.fullName },
            head_commit: { id: commit.sha, message: commit.commit.message },
            commits: commits.data.map(c => ({
              sha: c.sha,
              message: c.commit.message,
              author: c.commit.author?.name,
              date: c.commit.author?.date,
              url: c.html_url,
            })),
            ref: `refs/heads/${repo.defaultBranch}`,
            before: '0000000000000000000000000000000000000000',
            after: commit.sha,
          },
        });
      }
    }

    // Fetch merged PRs since last sync
    if (repo.eventSources?.merged_prs) {
      const pulls = await octokit.rest.pulls.list({
        owner,
        repo: repoName,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      for (const pr of pulls.data) {
        if (pr.merged_at && new Date(pr.merged_at) > since) {
          events.push({
            type: 'pull_request_merged',
            providerEventId: String(pr.number),
            payload: {
              repository: { id: repo.providerRepoId, full_name: repo.fullName },
              pull_request: {
                number: pr.number,
                title: pr.title,
                body: pr.body,
                state: pr.state,
                merged: true,
                merged_at: pr.merged_at,
                base: { ref: pr.base.ref },
                head: { ref: pr.head.ref },
                user: { login: pr.user?.login },
                html_url: pr.html_url,
                commits: pr.commits,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files,
              },
            },
          });
        }
      }
    }

    // Fetch tags/releases since last sync
    if (repo.eventSources?.tags) {
      const tags = await octokit.rest.repos.listTags({
        owner,
        repo: repoName,
        per_page: 100,
      });

      for (const tag of tags.data) {
        // Check if tag is new since last sync (this is approximate)
        const tagDate = new Date(); // Would need to fetch tag commit date
        if (tagDate > since) {
          events.push({
            type: 'tag',
            providerEventId: tag.name,
            payload: {
              repository: { id: repo.providerRepoId, full_name: repo.fullName },
              ref: `refs/tags/${tag.name}`,
              ref_type: 'tag',
            },
          });
        }
      }

      // Also fetch releases
      const releases = await octokit.rest.repos.listReleases({
        owner,
        repo: repoName,
        per_page: 100,
      });

      for (const release of releases.data) {
        if (new Date(release.published_at) > since) {
          events.push({
            type: 'release',
            providerEventId: String(release.id),
            payload: {
              repository: { id: repo.providerRepoId, full_name: repo.fullName },
              release: {
                tag_name: release.tag_name,
                name: release.name,
                body: release.body,
                published_at: release.published_at,
                html_url: release.html_url,
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
  console.log(`Polling GitHub repositories since ${SINCE.toISOString()}`);

  const repos = await fetchConfiguredRepos();
  console.log(`Found ${repos.length} GitHub repositories to poll`);

  let allEvents: any[] = [];

  for (const repo of repos) {
    if (REPO_OVERRIDE && repo.fullName !== REPO_OVERRIDE) {
      continue;
    }

    console.log(`Polling ${repo.fullName}...`);
    const events = await pollGitHubRepo(repo, SINCE);
    console.log(`Found ${events.length} events for ${repo.fullName}`);
    allEvents.push(...events.map(e => ({ ...e, repositoryId: repo.id })));
  }

  // Store events for dispatch
  const fs = await import('fs');
  const eventsFile = '.github-events.json';
  fs.writeFileSync(eventsFile, JSON.stringify(allEvents, null, 2));
  console.log(`Stored ${allEvents.length} events to ${eventsFile}`);
}

main().catch(console.error);