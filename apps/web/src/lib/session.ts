import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { databaseConfigured, query } from './db.ts';

/**
 * Sessions.
 *
 * The cookie carries an opaque random token. The database stores only its
 * SHA-256, so a leaked database read hands the reader nothing usable: the server
 * never needs to reproduce a token, only to compare one.
 *
 * This still guards nothing but page sequencing. Every language is public, and
 * the registry is served as static files that never consult a cookie. When a
 * restricted language exists, the check belongs on the route that streams its
 * bytes, not here, because a page-level check protects the page and not the
 * content behind it.
 */

export const SESSION_COOKIE = 'nx_session';

/** Long enough not to be an irritation, short enough that a stolen laptop expires. */
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
 * The signed-in user, or undefined.
 *
 * Returns undefined rather than throwing when the accounts layer is absent or
 * unreachable, so a missing database degrades to "signed out" instead of a 500
 * on every page. The landing page never calls this at all, which is why it stays
 * static and keeps working regardless.
 */
export async function currentUser(): Promise<SessionUser | undefined> {
  // Read the cookie BEFORE checking configuration, even though the check is
  // cheaper. Touching `cookies()` is what marks the calling route dynamic, and
  // returning early would make that marking depend on whether DATABASE_URL
  // happened to be set during the build. A route that prerendered without it
  // would then serve a cached "signed out" answer to everyone, forever.
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
    // Deliberately swallowed and deliberately not logged with the token in
    // scope. A database that is down should read as signed out, not as a crash.
    return undefined;
  }
}

export async function isSignedIn(): Promise<boolean> {
  return Boolean(await currentUser());
}

/** Delete the row as well as the cookie, so the token is dead everywhere. */
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
