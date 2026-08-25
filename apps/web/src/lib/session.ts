import { cookies } from 'next/headers';

/**
 * The signed-in gate.
 *
 * This is NOT authentication and must not be mistaken for it. There is no
 * identity provider yet, so this cookie only records that someone pressed the
 * button. It is a UX gate that sequences the landing page ahead of the app, and
 * it is safe today for exactly one reason: nothing behind it is restricted.
 * Every language in the registry is public, and the registry itself is served as
 * static files that never consult this cookie.
 *
 * When Phase 5 lands, the GitHub OAuth callback becomes the only thing that
 * issues this cookie, and its value becomes a real session identifier rather
 * than a flag. Guarding actual content is a separate job that belongs on the
 * server route that serves it, never on a cookie the client could forge.
 */
export const SESSION_COOKIE = 'nx_session';

export async function isSignedIn(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(SESSION_COOKIE)?.value);
}
