import type { ReactNode, Ref } from 'react';

/** Console chrome only. Language-specific surface tokens stay in the callers,
 * because delivered shared files are also linted against other installed languages. */
export interface SignalChartProps {
  label?: string;
  source?: string;
  window?: string;
  updated?: string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function SignalChartFrame({ ref, name, label, summary, surface, source, window: windowLabel, updated, width, height, animated, status, className = '', children }: SignalChartProps & {
  ref?: Ref<HTMLDivElement>; name: string; summary: ReactNode; surface: string; animated: boolean; status?: string | null; children: ReactNode;
}) {
  return <div ref={ref} data-nx-chart={name} data-nx-animated={animated}
    className={`@container flex min-w-0 flex-col rounded-[var(--nx-radius-card)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, background: surface, boxSizing: 'border-box' }}>
    <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span className="text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)] tracking-[var(--nx-type-caption-tracking)] text-[var(--nx-muted)] uppercase">{label}</span>
      <span data-nx-summary className="text-[length:var(--nx-type-pageTitle-size)] font-[number:var(--nx-type-pageTitle-weight)] tabular-nums">{summary}</span>
    </div>
    {status ? <div role="status" className="flex min-h-[180px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> : children}
    {(source || windowLabel || updated) && <div className="mt-3 flex shrink-0 flex-wrap justify-between gap-x-4 gap-y-1 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-2 text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)] tracking-[var(--nx-type-caption-tracking)] text-[var(--nx-faint)] tabular-nums">
      {source && <span>{source}</span>}{windowLabel && <span>{windowLabel}</span>}{updated && <span>{updated}</span>}
    </div>}
  </div>;
}

/** Reserve legible plot dimensions; short or narrow containers scroll locally. */
export function SignalPlot({ children, height = 220, minWidth = 360 }: { children: ReactNode; height?: number; minWidth?: number }) {
  return <div className="mt-3 min-h-0 flex-auto overflow-auto" style={{ height }}>
    <div className="h-full" style={{ minWidth, minHeight: height }}>{children}</div>
  </div>;
}

export function SignalTooltip({ title, surface, children }: { title: string; surface: string; children: ReactNode }) {
  return <div role="status" style={{ background: surface }} className="max-w-[280px] break-words rounded-[var(--nx-radius-card)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-muted)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)] leading-[var(--nx-type-tooltip-lineHeight)] text-[var(--nx-ink)] tabular-nums">
    <div className="mb-1 font-[number:var(--nx-font-weight-bold)]">{title}</div>{children}
  </div>;
}

export function SignalKey({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)] tabular-nums">{children}</div>;
}
