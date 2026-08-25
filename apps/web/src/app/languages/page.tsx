import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { IndexView } from '@/components/IndexView.tsx';
import { isSignedIn } from '@/lib/session.ts';

export const metadata: Metadata = {
  title: 'Design languages',
};

/**
 * The app starts here. `/` is the landing page.
 *
 * Reading the session makes this route dynamic while every other route still
 * prerenders. That is the intended trade: the gate is the one thing that cannot
 * be decided at build time.
 */
export default async function Page() {
  if (!(await isSignedIn())) redirect('/login');
  return <IndexView />;
}
