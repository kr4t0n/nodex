import 'server-only';

/**
 * GitHub OAuth, the web half.
 *
 * Only what the flow needs. No SDK: this is two HTTP calls, and a dependency
 * would be more code to audit than the code it replaces for something that
 * touches credentials.
 */

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export function oauthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4180').replace(
    /\/+$/,
    '',
  );
}

export function callbackUrl(): string {
  return `${siteUrl()}/api/auth/github/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? '',
    redirect_uri: callbackUrl(),
    // The default scope already includes the public profile. Asking for less is
    // not possible; asking for more would be asking for access this does not use.
    scope: 'read:user',
    state,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Trade the callback code for an access token.
 *
 * GitHub returns 200 with an `error` field rather than an HTTP error status when
 * the code is bad, so checking `res.ok` alone silently produces `undefined` and
 * a confusing failure two calls later.
 */
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(),
    }),
  });

  const payload = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!payload.access_token) {
    // The description is GitHub's own prose and carries no secret. The token
    // never appears here because there is not one.
    throw new Error(
      payload.error_description ?? payload.error ?? 'no access token returned',
    );
  }
  return payload.access_token;
}

export async function fetchUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'nodex',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub user lookup returned ${res.status}`);
  }
  return (await res.json()) as GitHubUser;
}
