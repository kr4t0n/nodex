import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { approveCode, denyCode } from '@/app/activate/actions.ts';
import { LanguageTheme } from '@/components/LanguageTheme.tsx';
import { findByUserCode, normalizeUserCode } from '@/lib/cli-auth.ts';
import { currentUser } from '@/lib/session.ts';

export const metadata: Metadata = {
  title: 'Authorise the CLI',
};

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; done?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const { code = '', error, done } = await searchParams;
  const normalized = code ? normalizeUserCode(code) : '';
  // Only looked up once a full code is present, so arriving with nothing shows
  // the form rather than an error.
  const pending = normalized ? await findByUserCode(normalized) : undefined;

  return (
    <>
      <LanguageTheme />
      <main className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center px-6 py-20 lg:px-10">
        <div className="max-w-[46ch]">
          <Link
            href="/languages"
            className="text-[13px] font-extrabold tracking-[0.1em] uppercase no-underline"
            style={{ color: 'var(--nx-ink, #1C1C1A)' }}
          >
            nodex
          </Link>

          {done ? (
            <Outcome done={done} />
          ) : (
            <>
              <h1 className="mt-14 mb-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[36px]">
                Authorise the CLI.
              </h1>
              <p
                className="mt-5 mb-0 text-[13.5px] leading-[1.75]"
                style={{ color: 'var(--nx-muted, #8F8E88)' }}
              >
                Signed in as {user.login}. Enter the code shown in your terminal.
              </p>

              {error ? (
                <div className="nx-alert nx-alert--important mt-8" role="alert">
                  <p className="nx-alert__title">No such code</p>
                  <p className="nx-alert__body">
                    That code is unknown, already used, or expired. Run{' '}
                    <code className="nx-code">nodex login</code> again for a new
                    one.
                  </p>
                </div>
              ) : null}

              <form action={approveCode} className="mt-9">
                <div className="nx-field max-w-[22ch]">
                  <label className="nx-field__label" htmlFor="code">
                    Device code
                  </label>
                  <input
                    id="code"
                    name="code"
                    className="nx-input"
                    defaultValue={normalized}
                    placeholder="ABCD-2345"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    required
                  />
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button type="submit" className="nx-btn nx-btn--solid">
                    {pending ? `Authorise ${pending.userCode}` : 'Authorise'}
                  </button>
                  {pending ? (
                    <button
                      type="submit"
                      formAction={denyCode}
                      className="nx-btn nx-btn--quiet"
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
              </form>

              <p
                className="mt-8 mb-0 text-[11.5px] leading-[1.7]"
                style={{ color: 'var(--nx-muted, #8F8E88)' }}
              >
                Only authorise a code you started yourself. It grants the
                terminal that requested it the same access as this browser.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Outcome({ done }: { done: string }) {
  const approved = done === 'approved';
  return (
    <>
      <h1 className="mt-14 mb-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[36px]">
        {approved ? 'Terminal authorised.' : 'Request rejected.'}
      </h1>
      <p
        className="mt-5 mb-0 text-[13.5px] leading-[1.75]"
        style={{ color: 'var(--nx-muted, #8F8E88)' }}
      >
        {approved
          ? 'You can close this tab. The terminal will pick it up within a few seconds.'
          : 'Nothing was granted. The terminal will report that the request was denied.'}
      </p>
      <Link href="/languages" className="nx-btn nx-btn--quiet mt-9 no-underline">
        Back to the languages
      </Link>
    </>
  );
}
