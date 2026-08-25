'use client';

import { ArrowLeft, Check, Copy } from '@phosphor-icons/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { signOut } from '@/app/login/actions.ts';

/** Nav sits on one line and stays under 72px. */
export function TopBar<T extends string>({
  back,
  language,
}: {
  // Generic over the href so typedRoutes can check it against the real route
  // table: a link to a page that does not exist fails the build rather than
  // becoming a 404 someone finds later. Interpolated slugs still validate,
  // because it is the shape `/l/[slug]` that is checked, not the value.
  back?: { href: Route<T>; label: string };
  language?: string;
}) {
  return (
    <header
      className="sticky top-0 z-10 backdrop-blur-[6px]"
      style={{
        background: 'color-mix(in oklab, var(--nx-bg) 88%, transparent)',
        borderBottom: 'var(--nx-hairline) solid var(--nx-grid)',
      }}
    >
      <div className="mx-auto flex h-[64px] max-w-[1400px] items-center gap-5 px-6 lg:px-10">
        {/* Inside the app the wordmark returns to the app index, not to the
            marketing page. `/` is the landing. */}
        <Link
          href="/languages"
          className="text-[13px] font-extrabold tracking-[0.1em] uppercase no-underline"
          style={{ color: 'var(--nx-ink)' }}
        >
          nodex
        </Link>

        {language ? (
          <span className="nx-badge nx-badge--quiet hidden sm:inline-flex">
            {language}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          {back ? (
            <Link href={back.href} className="nx-btn nx-btn--quiet no-underline">
              <ArrowLeft size={13} weight="bold" aria-hidden />
              {back.label}
            </Link>
          ) : null}

          {/* A gate with no way back out is a trap, so the exit ships with it. */}
          <form action={signOut}>
            <button type="submit" className="nx-btn nx-btn--quiet">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

/**
 * The command string is the only place this app hands anything to the CLI.
 * Source code deliberately lives nowhere in this app: looking is this surface's
 * job, fetching is the CLI's.
 */
export function CommandRow({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, [command]);

  return (
    // .nx-command is the code primitive, not local CSS.
    <div className="nx-command">
      {/* Wraps rather than truncates. This string is the entire handoff to the
          CLI, so an ellipsis in the middle of it makes the page useless. */}
      <span className="min-w-0 flex-1">{command}</span>
      <button
        className="nx-btn nx-btn--outline"
        type="button"
        onClick={copy}
        aria-label={copied ? 'Command copied' : 'Copy command'}
      >
        {copied ? (
          <Check size={13} weight="bold" aria-hidden />
        ) : (
          <Copy size={13} weight="bold" aria-hidden />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 lg:px-10">{children}</div>
  );
}

// Both of these are registry primitives (status and empty-state), not local CSS.
export function Loading({ label }: { label: string }) {
  return (
    <div className="nx-status-block" role="status">
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="nx-empty">
      <p className="nx-empty__title">{title}</p>
      <p className="nx-empty__hint">{hint}</p>
      {action ? <div className="nx-empty__action">{action}</div> : null}
    </div>
  );
}
