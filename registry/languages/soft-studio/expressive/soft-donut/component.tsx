'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { studioTone, type StudioTone } from '../../../../_shared/studio-categorical';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftDonutDatum { id: string; label: string; value: number | null; tone?: StudioTone }
export interface SoftDonutProps {
  data: readonly SoftDonutDatum[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}

interface Part extends SoftDonutDatum { fill: string }
const tones: Record<StudioTone, string> = {
  a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)',
};
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Slice({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload }: PieSectorShapeProps) {
  const part = payload as Part;
  if (!part.value) return <g />;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle}
    fill={part.fill} stroke="none" data-nx-soft-slice={part.id} data-nx-value={part.value} data-nx-start={startAngle} data-nx-end={endAngle} />;
}

/** A generous opening and exact sector angles; zero shares never acquire a decorative sliver. */
export function SoftDonut({ data, unitLabel = 'Total', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Composition of a total' }: SoftDonutProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { parts, total, valid } = useMemo(() => {
    const ids = new Set<string>(); let valid = true;
    const parts = data.map((datum): Part => {
      if (!datum.id.trim() || ids.has(datum.id)) valid = false;
      ids.add(datum.id);
      return { ...datum, value: datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 ? datum.value : null,
        fill: tones[studioTone(datum.id, datum.tone)] };
    });
    const sum = parts.reduce((sum, part) => sum + (part.value ?? 0), 0);
    return { parts, valid, total: valid && parts.every(part => part.value !== null) && Number.isFinite(sum) ? sum : null };
  }, [data]);
  const status = !parts.length ? 'No categories to compare.' : !valid ? 'Each category needs a unique, nonempty ID.'
    : total === null ? 'A complete breakdown is required.' : total === 0 ? 'No positive values to compare.' : null;

  return <StudioChartFrame ref={ref} name="soft-donut" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} className={className}>
    <div className="mt-[var(--nx-space-cardBodyGap)] grid min-h-0 flex-1 items-center gap-[var(--nx-space-gridGap)] overflow-auto @min-[480px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-[280px]">
        {status ? <div role="status" className="flex h-full items-center justify-center px-4 text-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> : <>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 280, height: 280 }}>
            <PieChart accessibilityLayer title={label}
              desc={`Each sector is its exact share of ${unitLabel}. The key includes zero shares. Use left and right arrow keys to inspect categories.`}
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <Tooltip isAnimationActive={false} content={({ active, payload }) => {
                const part = payload?.[0]?.payload as Part | undefined;
                return active && part && part.value !== null && total ? <StudioChartTooltip title={part.label}>{valueFormatter(part.value)} · {percent.format(part.value / total)}</StudioChartTooltip> : null;
              }} />
              <Pie id={`${id}-parts`} data={parts} dataKey="value" nameKey="label" cx="50%" cy="50%"
                innerRadius="66%" outerRadius="94%" startAngle={90} endAngle={-270} minAngle={0} paddingAngle={0}
                shape={Slice} rootTabIndex={-1} fill="var(--nx-seriesA)" stroke="none" {...motion} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute top-1/2 left-1/2 w-[56%] -translate-x-1/2 -translate-y-1/2 text-center">
            <div data-nx-soft-total className="break-all text-[length:var(--nx-type-stat-size)] leading-[var(--nx-type-stat-lineHeight)] font-[number:var(--nx-font-weight-bold)] tracking-[var(--nx-type-stat-tracking)] tabular-nums">{valueFormatter(total!)}</div>
            <div className="mt-2 break-words text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{unitLabel}</div>
          </div>
        </>}
      </div>
      <ul aria-label="Category values and shares" className="m-0 min-w-0 list-none p-0">
        {parts.map((part, index) => <li key={`${part.id}-${index}`} data-nx-soft-key={part.id}
          className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-x-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] py-3 first:pt-0 last:border-0 last:pb-0">
          <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: part.fill }} />
          <span className="break-words text-[length:var(--nx-type-body-size)] font-[number:var(--nx-font-weight-medium)]">{part.label}</span>
          <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)] tabular-nums">{total && part.value !== null ? percent.format(part.value / total) : '—'}</span>
          <span className="col-start-2 mt-1 break-all text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] tabular-nums">{part.value === null ? '—' : valueFormatter(part.value)}</span>
        </li>)}
      </ul>
    </div>
  </StudioChartFrame>;
}
