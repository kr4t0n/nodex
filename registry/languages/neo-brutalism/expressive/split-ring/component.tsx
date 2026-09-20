'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts';
import { neoCategoryTone, type NeoCategoryTone } from '../../../../_shared/neo-categorical';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface SplitRingDatum {
  id: string;
  label: string;
  /** Nonnegative part of a complete total; an unknown part makes the allocation unavailable. */
  value: number | null;
  tone?: NeoCategoryTone;
}

export interface SplitRingProps {
  data: readonly SplitRingDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Part extends SplitRingDatum { fill: string }
const tones: Record<NeoCategoryTone, string> = {
  a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)',
};
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);

function RingSlice({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload }: PieSectorShapeProps) {
  const part = payload as Part;
  if (!part.value) return <g />;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle}
    fill={part.fill} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)"
    data-nx-ring-slice={part.id} data-nx-value={part.value} data-nx-start={startAngle} data-nx-end={endAngle} />;
}

/** Exact proportions: no minimum angle, exploded slices or gaps that distort small parts. */
export function SplitRing({ data, unitLabel = 'Total', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className = '', 'aria-label': label = 'Composition of a total' }: SplitRingProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { parts, total, validIds, complete } = useMemo(() => {
    const ids = new Set<string>();
    let validIds = true;
    const parts = data.map((datum): Part => {
      if (!datum.id.trim() || ids.has(datum.id)) validIds = false;
      ids.add(datum.id);
      return { ...datum,
        value: datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 ? datum.value : null,
        fill: tones[neoCategoryTone(datum.id, datum.tone)] };
    });
    const sum = parts.reduce((sum, part) => sum + (part.value ?? 0), 0);
    const complete = parts.every(part => part.value !== null) && Number.isFinite(sum);
    return { parts, total: complete ? sum : null, validIds, complete };
  }, [data]);
  const status = !parts.length ? 'No categories to compare.'
    : !validIds ? 'Each category needs a unique, nonempty ID.'
    : !complete ? 'A complete breakdown is required.'
    : total === 0 ? 'No positive values to compare.' : null;

  return <div ref={ref} className={`@container flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="split-ring" data-nx-animated={motion.isAnimationActive}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] pb-3 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] tracking-[var(--nx-type-label-tracking)] uppercase">
      <span>{unitLabel}</span>{contextLabel && <span className="text-[var(--nx-muted)]">{contextLabel}</span>}
    </div>
    <div className="mt-[var(--nx-space-cardBodyGap)] grid min-h-0 flex-1 items-center gap-[var(--nx-space-gridGap)] overflow-auto @min-[500px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        {status ? <div role="status" className="flex h-full items-center justify-center px-4 text-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> : <>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 320 }}>
            <PieChart accessibilityLayer title={label}
              desc={`Each outlined sector shows its share of ${unitLabel}. Exact values and percentages appear in the adjacent key. Use left and right arrow keys to inspect categories.`}
              className="[&_.recharts-pie]:[filter:drop-shadow(var(--nx-shadow-surface)_var(--nx-ink))] [&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <Tooltip isAnimationActive={false} content={({ active, payload }) => {
                const part = payload?.[0]?.payload as Part | undefined;
                return active && part && part.value !== null && total ? <div role="status" className="max-w-[240px] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-bg)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)] [box-shadow:var(--nx-shadow-popover)_var(--nx-ink)]">
                  <div className="font-[number:var(--nx-font-weight-bold)]">{part.label}</div>
                  <div>{valueFormatter(part.value)} · {percent.format(part.value / total)}</div>
                </div> : null;
              }} />
              <Pie id={`${id}-parts`} data={parts} dataKey="value" nameKey="label" cx="48%" cy="48%"
                innerRadius="51%" outerRadius="85%" startAngle={90} endAngle={-270} minAngle={0} paddingAngle={0}
                shape={RingSlice} rootTabIndex={-1} fill="var(--nx-ink)" stroke="none" {...motion} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute top-[48%] left-[48%] w-[43%] -translate-x-1/2 -translate-y-1/2 text-center">
            <div data-nx-ring-total className="break-words text-[length:var(--nx-type-stat-size)] leading-[var(--nx-type-stat-lineHeight)] font-[number:var(--nx-font-weight-bold)] tracking-[var(--nx-type-stat-tracking)]">{valueFormatter(total!)}</div>
            <div className="mt-2 text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)] uppercase">{unitLabel}</div>
          </div>
        </>}
      </div>
      <ul aria-label="Category values and shares" className="m-0 min-w-0 list-none p-0">
        {parts.map((part, index) => <li key={`${part.id}-${index}`} data-nx-ring-key={part.id} className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] py-4 first:pt-0 last:border-0 last:pb-0">
          <span aria-hidden="true" className="h-4 w-4 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)]" style={{ background: part.fill }} />
          <span className="break-words text-[length:var(--nx-type-body-size)] font-[number:var(--nx-font-weight-bold)]">{part.label}</span>
          <span className="bg-[var(--nx-fieldFill)] px-2 py-1 text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)]">{validIds && total && part.value !== null ? percent.format(part.value / total) : '—'}</span>
          <span className="col-start-2 mt-1 text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] leading-tight">{part.value === null ? '—' : valueFormatter(part.value)}</span>
        </li>)}
      </ul>
    </div>
  </div>;
}
