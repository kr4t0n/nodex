import type { ReactNode, Ref } from 'react';

/** Shared frame only; each chart retains its own Recharts composition and data contract. */
export function NeoChartFrame({ ref, name, heading, contextLabel, width, height, animated, status, className = '', children }: {
  ref?: Ref<HTMLDivElement>; name: string; heading: string; contextLabel?: string;
  width?: number; height?: number; animated: boolean; status?: string | null; className?: string; children: ReactNode;
}) {
  return <div ref={ref} className={`@container flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart={name} data-nx-animated={animated}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] pb-3 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] tracking-[var(--nx-type-label-tracking)] uppercase">
      <span>{heading}</span>{contextLabel && <span className="text-[var(--nx-muted)]">{contextLabel}</span>}
    </div>
    {status ? <div role="status" className="flex min-h-[260px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> : children}
  </div>;
}

export function NeoChartTooltip({ title, children }: { title: string; children: ReactNode }) {
  return <div role="status" className="max-w-[260px] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-bg)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)] [box-shadow:var(--nx-shadow-popover)_var(--nx-ink)]">
    <div className="font-[number:var(--nx-font-weight-bold)]">{title}</div>{children}
  </div>;
}
