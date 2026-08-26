'use server';

import { redirect } from 'next/navigation';

import { destroySession } from '@/lib/session.ts';

/**
 * Signing IN is not here. It is a redirect to GitHub and a callback route
 * handler, because OAuth is a browser navigation to a third party rather than
 * something a form post can do.
 *
 * Signing out stays an action: it is a state change on our own server, and a
 * form post is the honest way to express that. A link would let a prefetch or a
 * crawler sign people out.
 */
export async function signOut(): Promise<void> {
  await destroySession();
  redirect('/');
}
