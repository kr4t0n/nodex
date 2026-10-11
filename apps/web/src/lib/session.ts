import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { databaseConfigured, query } from './db.ts';

/**
 * Cookies carry opaque tokens; only their SHA-256 fingerprints enter the database.
 */

export const SESSION_COOKIE = 'nx_session';

const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

interface UserRow {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(
  userId: string,
  token: string,
  origin: 'web' | 'cli' = 'web',
): Promise<void> {
  await query(
    `insert into sessions (token_hash, user_id, expires_at, origin)
     values ($1, $2, now() + make_interval(days => $3), $4)`,
    [fingerprint(token), userId, SESSION_DAYS, origin],
  );
}

/**
 * An absent or unreachable accounts database degrades to signed out.
 */
export async function currentUser(): Promise<SessionUser | undefined> {
  // Read cookies before configuration so an unconfigured build cannot cache a
  // signed-out response as static HTML.
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || !databaseConfigured()) return undefined;

  try {
    const rows = await query<UserRow>(
      `select u.id, u.login, u.name, u.avatar_url
         from sessions s
         join users u on u.id = s.user_id
        where s.token_hash = $1
          and s.expires_at > now()`,
      [fingerprint(token)],
    );
    const row = rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      login: row.login,
      name: row.name,
      avatarUrl: row.avatar_url,
    };
  } catch {
    // Do not log database errors with a session token in scope.
    return undefined;
  }
}

export async function isSignedIn(): Promise<boolean> {
  return Boolean(await currentUser());
}

/** Attempt server revocation; always clear this browser's cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && databaseConfigured()) {
    try {
      await query('delete from sessions where token_hash = $1', [
        fingerprint(token),
      ]);
    } catch {
      // Clearing the cookie below still signs this browser out.
    }
  }
  store.delete(SESSION_COOKIE);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  };
}
