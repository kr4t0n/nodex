import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { authorizeUrl, oauthConfigured, siteUrl } from '@/lib/github.ts';

export const OAUTH_STATE_COOKIE = 'nx_oauth_state';

/**
 * Start the OAuth dance.
 *
 * The `state` parameter is the CSRF defence, and it is not optional: without it
 * an attacker can hand someone a crafted callback URL and silently sign them
 * into an account they do not own. It is generated here, stored in an httpOnly
 * cookie, and compared on the way back.
 */
export async function GET() {
  if (!oauthConfigured()) {
    return NextResponse.redirect(`${siteUrl()}/login?error=unconfigured`);
  }

  const state = randomBytes(16).toString('base64url');
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    // Long enough to sign in, short enough that an abandoned attempt expires.
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeUrl(state));
}
