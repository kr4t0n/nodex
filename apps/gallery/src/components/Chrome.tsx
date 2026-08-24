import { ArrowLeft, Check, Copy } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

/** Nav sits on one line and stays under 72px. */
export function TopBar({
  back,
  language,
}: {
  back?: { to: string; label: string };
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
        <Link
          to="/"
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

        {back ? (
          <Link to={back.to} className="nx-btn nx-btn--quiet ml-auto no-underline">
            <ArrowLeft size={13} weight="bold" aria-hidden />
            {back.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The command string is the only place the gallery hands anything to the CLI.
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
    <div
      className="flex items-center gap-3 rounded-[var(--radius-card)] py-2 pr-2 pl-4"
      style={{ border: 'var(--nx-hairline) solid var(--nx-grid)' }}
    >
      {/* Wraps rather than truncates. This string is the entire handoff to the
          CLI, so an ellipsis in the middle of it makes the page useless. */}
      <code
        className="min-w-0 flex-1 text-[11.5px] leading-[1.6] break-all"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        {command}
      </code>
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

export function Loading({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[40dvh] items-center justify-center text-[11.5px]"
      style={{ color: 'var(--nx-muted)' }}
      role="status"
    >
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
    <div
      className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] px-7 py-10"
      style={{ border: 'var(--nx-hairline) dashed var(--nx-grid)' }}
    >
      <p className="m-0 text-[15px] font-bold tracking-[-0.02em]">{title}</p>
      <p className="m-0 max-w-[46ch] text-[11.5px]" style={{ color: 'var(--nx-muted)' }}>
        {hint}
      </p>
      {action}
    </div>
  );
}
