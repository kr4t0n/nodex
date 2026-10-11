import 'server-only';

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
    // Sign-in needs profile access only, never repository access.
    scope: 'read:user',
    state,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * GitHub can return an error payload with HTTP 200; validate both status and body.
 */
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    redirect: 'error',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(),
    }),
  });

  const payload: unknown = await res.json().catch(() => null);
  if (
    !res.ok ||
    !record(payload) ||
    'error' in payload ||
    !nonemptyText(payload.access_token) ||
    !/^[A-Za-z0-9._~+/-]+=*$/.test(payload.access_token) ||
    typeof payload.token_type !== 'string' ||
    payload.token_type.toLowerCase() !== 'bearer'
  ) {
    throw new Error('GitHub token exchange failed.');
  }
  return payload.access_token;
}

export async function fetchUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    redirect: 'error',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'nodex',
    },
  });
  if (!res.ok) {
    throw new Error('GitHub user lookup failed.');
  }
  const payload: unknown = await res.json().catch(() => null);
  if (
    !record(payload) ||
    typeof payload.id !== 'number' ||
    !Number.isSafeInteger(payload.id) ||
    payload.id <= 0 ||
    !nonemptyText(payload.login) ||
    !(payload.name === null || typeof payload.name === 'string') ||
    !(payload.avatar_url === null || secureAvatar(payload.avatar_url))
  )
    throw new Error('GitHub returned an invalid profile.');
  return {
    id: payload.id,
    login: payload.login,
    name: payload.name,
    avatar_url: payload.avatar_url,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonemptyText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !/[\p{Cc}\p{Cf}]/u.test(value)
  );
}

function secureAvatar(value: unknown): value is string {
  if (!nonemptyText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
