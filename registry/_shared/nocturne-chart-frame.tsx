import type { ReactNode, Ref } from 'react';

/** Shared presentation only; each chart owns its observations and native geometry. */
export function NocturneChartFrame({ ref, name, heading, contextLabel, width, height, animated, status, className = '', children }: {
  ref?: Ref<HTMLDivElement>; name: string; heading: string; contextLabel?: string;
  width?: number; height?: number; animated: boolean; status?: string | null; className?: string; children: ReactNode;
}) {
  return <div ref={ref} data-nx-chart={name} data-nx-animated={animated}
    className={`@container flex min-w-0 flex-col rounded-[var(--nx-radius-card)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] bg-[var(--nx-surfaceFill)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }}>
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <span className="min-w-0 break-words text-[length:var(--nx-type-cardTitle-size)] font-[number:var(--nx-type-cardTitle-weight)] tracking-[var(--nx-type-cardTitle-tracking)]">{heading}</span>
      {contextLabel && <span className="min-w-0 break-words text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{contextLabel}</span>}
    </div>
    {status ? <div role="status" className="flex min-h-[180px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> : children}
  </div>;
}

export function NocturneChartTooltip({ title, children }: { title: string; children: ReactNode }) {
  return <div role="status" className="max-w-[280px] rounded-[var(--nx-radius-tooltip)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] bg-[var(--nx-surfaceFill)] text-[length:var(--nx-type-tooltip-size)] leading-[var(--nx-type-tooltip-lineHeight)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-tooltipPadding)] tabular-nums">
    <div className="mb-1 break-words font-[number:var(--nx-font-weight-semibold)]">{title}</div>{children}
  </div>;
}
