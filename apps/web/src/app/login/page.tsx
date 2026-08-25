import { GithubLogo } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signIn } from '@/app/login/actions.ts';
import { LanguageTheme } from '@/components/LanguageTheme.tsx';
import { isSignedIn } from '@/lib/session.ts';

export const metadata: Metadata = {
  title: 'Sign in to nodex',
};

export default async function Page() {
  if (await isSignedIn()) redirect('/languages');

  return (
    <>
      <LanguageTheme />
      <main className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center px-6 py-20 lg:px-10">
        <div className="max-w-[42ch]">
          <Link
            href="/"
            className="text-[13px] font-extrabold tracking-[0.1em] uppercase no-underline"
            style={{ color: 'var(--nx-ink, #1C1C1A)' }}
          >
            nodex
          </Link>

          <h1 className="mt-14 mb-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[36px]">
            Sign in to browse the languages.
          </h1>
          <p
            className="mt-5 mb-0 text-[13.5px] leading-[1.75]"
            style={{ color: 'var(--nx-muted, #8F8E88)' }}
          >
            An account is how nodex will know which languages you can reach once
            some of them stop being public.
          </p>

          <form action={signIn} className="mt-10">
            <button type="submit" className="nx-btn nx-btn--solid">
              <GithubLogo size={15} weight="fill" aria-hidden />
              Continue with GitHub
            </button>
          </form>

          {/* Said plainly rather than hidden. A sign-in button that quietly does
              nothing of the sort is worse than no button. */}
          <p
            className="mt-8 mb-0 max-w-[46ch] text-[11.5px] leading-[1.7]"
            style={{ color: 'var(--nx-muted, #8F8E88)' }}
          >
            GitHub accounts are not connected yet. This starts a local session so
            you can walk the flow. Every language is public today, so nothing here
            is being withheld.
          </p>
        </div>
      </main>
    </>
  );
}
