import type { ReactNode, RefObject } from 'react';

export interface SketchPresentationProps {
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
export const formatNumber = (value: number) => number.format(value);
export const compactNumber = (value: number) => compact.format(value);
export const sketchTick = { fill: 'var(--nx-muted)', fontFamily: 'var(--nx-font-heading)', fontSize: 'var(--nx-type-axis-size)' };
export const sketchFocus = '[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]';

export function SketchFrame({ ref, slug, animated, unitLabel, contextLabel, width, height, className = '', children }: {
  ref: RefObject<HTMLDivElement | null>; slug: string; animated: boolean; children: ReactNode;
} & Pick<SketchPresentationProps, 'unitLabel' | 'contextLabel' | 'width' | 'height' | 'className'>) {
  return <div ref={ref} className={`@container flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart={slug} data-nx-animated={animated}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 text-[length:var(--nx-type-label-size)] text-[var(--nx-muted)]">
      <span>{unitLabel}</span>{contextLabel && <span>{contextLabel}</span>}
    </div>{children}
  </div>;
}
export function SketchStatus({ children }: { children: ReactNode }) {
  return <div role="status" className="flex min-h-[200px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{children}</div>;
}
export function SketchPlot({ height, minWidth = 340, plotHeight, children }: { height?: number; minWidth?: number; plotHeight?: number; children: ReactNode }) {
  return <div className={`mt-[var(--nx-space-cardBodyGap)] ${height === undefined ? plotHeight ? 'w-full overflow-x-auto overflow-y-hidden' : 'aspect-[640/320] min-h-[280px] w-full overflow-x-auto overflow-y-hidden' : 'min-h-0 flex-1 overflow-auto'}`}>
    <div className="overflow-hidden" style={{ minWidth, height: plotHeight ?? '100%' }}>{children}</div>
  </div>;
}
export function SketchTooltip({ children }: { children: ReactNode }) {
  return <div role="status" className="max-w-[260px] rounded-[var(--nx-radius-tooltip)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] bg-[var(--nx-surfaceFill)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)]">{children}</div>;
}
export function SketchKey({ items }: { items: readonly { id: string; label: string; paint: string }[] }) {
  return <ul aria-label="Series key" className="mt-4 mb-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
    {items.map((item, index) => <li key={`${item.id}-${index}`} className="flex items-center gap-2 text-[length:var(--nx-type-uiLabel-size)] [font-family:var(--nx-font-ui)]">
      <span aria-hidden="true" className="h-3 w-3 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)]" style={{ background: item.paint }} />{item.label}
    </li>)}
  </ul>;
}
