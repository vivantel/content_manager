import { SignJWT, importPKCS8 } from 'jose';

interface GitHubAppConfig {
  appId: string;
  privateKey: string;
}

interface InstallationToken {
  token: string;
  expiresAt: string;
  repositorySelection: 'all' | 'selected';
  permissions: Record<string, string>;
}

interface GitHubInstallation {
  id: number;
  account: { login: string };
}

interface GitHubRepository {
  full_name: string;
}

let cachedToken: InstallationToken | null = null;

export async function getGitHubAppJWT(config: GitHubAppConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(
    config.privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '')
      .trim(),
    'RS256'
  );

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 600)
    .setIssuer(config.appId)
    .sign(privateKey);

  return jwt;
}

export async function getInstallationId(
  jwt: string,
  owner: string
): Promise<number | null> {
  const response = await fetch('https://api.github.com/app/installations', {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch installations: ${response.statusText}`);
  }

  const installations: GitHubInstallation[] = await response.json();
  const installation = installations.find(
    (i) => i.account.login.toLowerCase() === owner.toLowerCase()
  );

  return installation?.id || null;
}

export async function getInstallationToken(
  jwt: string,
  installationId: number
): Promise<InstallationToken> {
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create installation token: ${response.statusText}`);
  }

  return response.json();
}

export async function getValidInstallationToken(
  config: GitHubAppConfig,
  owner: string
): Promise<string> {
  // Check if cached token is still valid
  if (cachedToken && new Date(cachedToken.expiresAt) > new Date(Date.now() + 60000)) {
    return cachedToken.token;
  }

  const jwt = await getGitHubAppJWT(config);
  const installationId = await getInstallationId(jwt, owner);

  if (!installationId) {
    throw new Error(`No GitHub App installation found for owner: ${owner}`);
  }

  const tokenData = await getInstallationToken(jwt, installationId);
  cachedToken = tokenData;

  return tokenData.token;
}

export async function getInstallationTokenForRepo(
  config: GitHubAppConfig,
  owner: string,
  repo: string
): Promise<string> {
  // First try to get installation for the owner
  const jwt = await getGitHubAppJWT(config);
  
  // Get all installations and find one that has access to this repo
  const response = await fetch('https://api.github.com/app/installations', {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch installations: ${response.statusText}`);
  }

  const installations: GitHubInstallation[] = await response.json();
  
  for (const installation of installations) {
    // Check if this installation has access to the repo
    const reposResponse = await fetch(
      `https://api.github.com/user/installations/${installation.id}/repositories`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (reposResponse.ok) {
      const reposData = { repositories: [] as GitHubRepository[] };
      Object.assign(reposData, await reposResponse.json());
      const hasRepo = reposData.repositories.some(
        (r: GitHubRepository) => r.full_name.toLowerCase() === `${owner}/${repo}`.toLowerCase()
      );
      
      if (hasRepo) {
        const tokenData = await getInstallationToken(jwt, installation.id);
        return tokenData.token;
      }
    }
  }

  throw new Error(`No GitHub App installation found with access to ${owner}/${repo}`);
}