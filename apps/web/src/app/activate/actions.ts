'use server';

import { redirect } from 'next/navigation';

import { approve, deny, findByUserCode } from '@/lib/cli-auth.ts';
import { currentUser } from '@/lib/session.ts';

/**
 * Approving is a state change made by a signed-in person, so it is a form post
 * rather than a link. A link would let a prefetch, a crawler, or an image tag on
 * another site authorise a terminal on the reader's behalf.
 */
export async function approveCode(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '');

  const user = await currentUser();
  if (!user) redirect(`/login?next=activate`);

  const pending = await findByUserCode(code);
  if (!pending) redirect(`/activate?code=${encodeURIComponent(code)}&error=unknown`);

  const ok = await approve(code, user.id);
  redirect(
    ok
      ? '/activate?done=approved'
      : `/activate?code=${encodeURIComponent(code)}&error=unknown`,
  );
}

export async function denyCode(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '');
  const user = await currentUser();
  if (!user) redirect('/login');

  await deny(code);
  redirect('/activate?done=denied');
}
