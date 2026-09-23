import type { ReactNode, Ref } from 'react';

/** Presentation shared by studio charts; each owns its native chart and data contract. */
export function StudioChartFrame({ ref, name, heading, contextLabel, width, height, animated, status, className = '', children }: {
  ref?: Ref<HTMLDivElement>; name: string; heading: string; contextLabel?: string;
  width?: number; height?: number; animated: boolean; status?: string | null; className?: string; children: ReactNode;
}) {
  return <div ref={ref} data-nx-chart={name} data-nx-animated={animated}
    className={`@container flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-surfaceFill)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)]">
      <span>{heading}</span>{contextLabel && <span className="text-[var(--nx-muted)]">{contextLabel}</span>}
    </div>
    {status ? <div role="status" className="flex min-h-[240px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> : children}
  </div>;
}

export function StudioChartTooltip({ title, children }: { title: string; children: ReactNode }) {
  return <div role="status" className="max-w-[260px] rounded-[var(--nx-radius-tooltip)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] bg-[var(--nx-surfaceFill)] text-[length:var(--nx-type-tooltip-size)] text-[var(--nx-ink)] [padding:var(--nx-space-tooltipPadding)] [box-shadow:var(--nx-shadow-popover)_var(--nx-ink)]">
    <div className="font-[number:var(--nx-font-weight-bold)]">{title}</div>{children}
  </div>;
}

export function StudioChartKey({ items }: { items: readonly { id: string; label: string; paint: string }[] }) {
  return <ul aria-label="Series key" className="mt-[var(--nx-space-cardBodyGap)] mb-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
    {items.map(item => <li key={item.id} className="flex items-center gap-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span data-nx-studio-key={item.id} aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.paint }} />{item.label}
    </li>)}
  </ul>;
}
