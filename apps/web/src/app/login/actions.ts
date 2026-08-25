'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE } from '@/lib/session.ts';

/**
 * Stands in for the GitHub OAuth callback until Phase 5 builds it.
 *
 * Deliberately a server action rather than a client fetch: the real callback
 * will also be a server round trip that sets an httpOnly cookie and redirects,
 * so the shape the rest of the app sees does not change when the identity
 * provider arrives. Only what happens inside this function does.
 */
export async function signIn(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, 'preview', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/languages');
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/');
}
