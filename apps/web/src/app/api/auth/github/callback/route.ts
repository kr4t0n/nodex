import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { OAUTH_STATE_COOKIE } from '@/app/api/auth/github/route.ts';
import { query } from '@/lib/db.ts';
import { exchangeCode, fetchUser, oauthConfigured, siteUrl } from '@/lib/github.ts';
import {
  createSession,
  newSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/session.ts';

/** Constant time, so the comparison cannot be used to guess the value. */
function statesMatch(a: string | undefined, b: string | null): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function failed(reason: string): NextResponse {
  // The reason is a fixed token from this file, never the underlying error.
  // Upstream messages can carry a code or a URL, and neither belongs in a query
  // string that ends up in browser history and server logs.
  return NextResponse.redirect(`${siteUrl()}/login?error=${reason}`);
}

export async function GET(request: NextRequest) {
  if (!oauthConfigured()) return failed('unconfigured');

  const params = request.nextUrl.searchParams;
  const store = await cookies();

  // GitHub reports a user who pressed Cancel this way rather than by not
  // calling back at all.
  if (params.get('error')) {
    store.delete(OAUTH_STATE_COOKIE);
    return failed('denied');
  }

  const code = params.get('code');
  if (!code) return failed('nocode');

  if (!statesMatch(store.get(OAUTH_STATE_COOKIE)?.value, params.get('state'))) {
    return failed('state');
  }
  // One attempt per state, so a replayed callback cannot mint a second session.
  store.delete(OAUTH_STATE_COOKIE);

  let profile;
  try {
    profile = await fetchUser(await exchangeCode(code));
  } catch {
    // Swallowed rather than surfaced: the message can quote the request, and
    // the request carried the client secret.
    return failed('exchange');
  }

  try {
    // Keyed on GitHub's numeric id, so renaming a GitHub account updates the
    // row rather than creating a second one.
    const rows = await query<{ id: string }>(
      `insert into users (github_id, login, name, avatar_url)
       values ($1, $2, $3, $4)
       on conflict (github_id) do update
         set login = excluded.login,
             name = excluded.name,
             avatar_url = excluded.avatar_url,
             updated_at = now()
       returning id`,
      [profile.id, profile.login, profile.name, profile.avatar_url],
    );

    const userId = rows[0]?.id;
    if (!userId) return failed('storage');

    const token = newSessionToken();
    await createSession(userId, token, 'web');
    store.set(SESSION_COOKIE, token, sessionCookieOptions());
  } catch {
    return failed('storage');
  }

  return NextResponse.redirect(`${siteUrl()}/languages`);
}
