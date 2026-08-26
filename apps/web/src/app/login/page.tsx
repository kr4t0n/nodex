import { GithubLogo } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LanguageTheme } from '@/components/LanguageTheme.tsx';
import { databaseConfigured } from '@/lib/db.ts';
import { oauthConfigured } from '@/lib/github.ts';
import { isSignedIn } from '@/lib/session.ts';

export const metadata: Metadata = {
  title: 'Sign in to nodex',
};

/**
 * Failure reasons are fixed tokens set by the callback route, never text from
 * an upstream error. Anything GitHub says can quote the request, and the request
 * carried the client secret.
 */
const REASONS: Record<string, string> = {
  denied: 'Sign in was cancelled.',
  state: 'That sign-in link expired. Try again.',
  nocode: 'GitHub did not complete the sign in. Try again.',
  exchange: 'GitHub declined the sign in. Try again.',
  storage: 'Could not save the session. Is the database running?',
  unconfigured: 'Sign in is not configured on this server yet.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isSignedIn()) redirect('/languages');

  const { error } = await searchParams;
  const message = error ? (REASONS[error] ?? REASONS.exchange) : undefined;
  const ready = oauthConfigured() && databaseConfigured();

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

          {message ? (
            <div className="nx-alert nx-alert--important mt-8" role="alert">
              <p className="nx-alert__title">Not signed in</p>
              <p className="nx-alert__body">{message}</p>
            </div>
          ) : null}

          {ready ? (
            // A plain link, not a form: this navigates to GitHub, and the round
            // trip is the whole point of OAuth.
            <a href="/api/auth/github" className="nx-btn nx-btn--solid mt-9 no-underline">
              <GithubLogo size={15} weight="fill" aria-hidden />
              Continue with GitHub
            </a>
          ) : (
            <p
              className="mt-9 mb-0 max-w-[46ch] text-[12px] leading-[1.7]"
              style={{ color: 'var(--nx-muted, #8F8E88)' }}
            >
              This server has no GitHub app or database configured, so there is
              nothing to sign in to. See the setup steps in the README.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
