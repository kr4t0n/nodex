import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { IndexView } from '@/components/IndexView.tsx';
import { currentUser } from '@/lib/session.ts';

export const metadata: Metadata = {
  title: 'Design languages',
};

/**
 * Never prerender this. The answer depends on a cookie, and a cached copy would
 * hand every visitor whichever answer the build machine got, which is "signed
 * out" and therefore a permanent redirect to the login page.
 *
 * `currentUser` reads the cookie unconditionally so this would hold anyway, but
 * that is an implementation detail of another module. Stated here, it survives
 * someone refactoring that one.
 */
export const dynamic = 'force-dynamic';

/**
 * The app's front door. `/` is the landing page.
 *
 * Reading the session makes this route dynamic while the 89 `/l/*` routes still
 * prerender. That is the intended trade: the gate and the signed-in user are the
 * two things that cannot be decided at build time, and they both live here.
 */
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');

  return (
    <IndexView user={{ login: user.login, avatarUrl: user.avatarUrl }} />
  );
}
