'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftDumbbellDatum { id: string; label: string; before: number | null; after: number | null }
export interface SoftDumbbellProps {
  data: readonly SoftDumbbellDatum[]; unitLabel?: string; contextLabel?: string; beforeLabel?: string; afterLabel?: string;
  valueFormatter?: (value: number) => string; width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row extends SoftDumbbellDatum { index: number; x: number }
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);
const finite = (value: number | null) => value !== null && Number.isFinite(value) ? value : null;

function Pair({ payload }: { payload?: Row }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const y = payload ? yScale?.(payload.index) : undefined;
  if (!payload || !xScale || y === undefined) return <g />;
  const before = payload.before === null ? undefined : xScale(payload.before);
  const after = payload.after === null ? undefined : xScale(payload.after);
  return <g data-nx-soft-pair={payload.id}>
    {before !== undefined && after !== undefined && <line x1={before} x2={after} y1={y} y2={y}
      data-nx-soft-pair-rail={payload.id} stroke="var(--nx-seriesD)" strokeWidth="var(--nx-stroke-mark)" />}
    {after !== undefined && <circle cx={after} cy={y} r={7} data-nx-soft-after={payload.id} fill="var(--nx-seriesA)" />}
    {before !== undefined && <circle cx={before} cy={y} r={4} data-nx-soft-before={payload.id}
      fill="var(--nx-surfaceFill)" stroke="var(--nx-seriesA)" strokeWidth="var(--nx-stroke-mark)" />}
    {before === undefined && after === undefined && <text x={xScale(0)} y={y} dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)">—</text>}
  </g>;
}

/** Open and filled endpoints retain their meaning for decreases, ties and incomplete pairs. */
export function SoftDumbbell({ data, unitLabel = 'Value', contextLabel, beforeLabel = 'Before', afterLabel = 'After', valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Before and after values' }: SoftDumbbellProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((datum, index): Row => {
    const before = finite(datum.before); const after = finite(datum.after);
    return { ...datum, before, after, index, x: before ?? after ?? 0 };
  }), [data]);
  const valid = rows.every(row => row.id.trim()) && new Set(rows.map(row => row.id)).size === rows.length;
  const values = rows.flatMap(row => [row.before, row.after].filter(value => value !== null));
  const minimum = Math.min(0, ...values); const maximum = Math.max(0, ...values);
  const status = !valid ? 'Each category needs a unique, nonempty ID.' : !rows.length ? 'No categories to compare.' : null;
  const labelWidth = Math.min(140, Math.max(72, ...rows.map(row => row.label.length * 7 + 12)));

  return <StudioChartFrame ref={ref} name="soft-dumbbell" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap gap-x-5 gap-y-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-[length:var(--nx-stroke-mark)] border-[var(--nx-seriesA)] bg-[var(--nx-surfaceFill)]" />{beforeLabel}</span>
      <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-[var(--nx-seriesA)]" />{afterLabel}</span>
    </div>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-auto ${height === undefined ? '' : 'min-h-0 flex-1'}`}>
      <div className="overflow-clip" style={{ minWidth: 340, height: Math.max(224, rows.length * 44 + 40) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
          <ScatterChart accessibilityLayer title={label}
            desc={`Open circles show ${beforeLabel}; filled circles show ${afterLabel}. Both use the same ${unitLabel} scale. Missing endpoints have no connecting line; ties show concentric circles. Use left and right arrow keys to inspect categories.`}
            margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
            <XAxis dataKey="x" type="number" domain={[minimum, maximum || (minimum === 0 ? 1 : 0)]} padding={{ left: 12, right: 12 }}
              height={34} tickCount={4} tickMargin={12} axisLine={false} tickLine={false} tickFormatter={(value: number) => compact.format(value)}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="index" type="number" reversed domain={[-0.5, rows.length - 0.5]} ticks={rows.map(row => row.index)} interval={0}
              width={labelWidth} tickMargin={12} axisLine={false} tickLine={false} tickFormatter={(index: number) => rows[index]?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Row | undefined;
              return active && row ? <StudioChartTooltip title={row.label}>
                <div>{beforeLabel}: {row.before === null ? 'Unavailable' : `${valueFormatter(row.before)} ${unitLabel}`}</div>
                <div>{afterLabel}: {row.after === null ? 'Unavailable' : `${valueFormatter(row.after)} ${unitLabel}`}</div>
              </StudioChartTooltip> : null;
            }} />
            <Scatter id={`${id}-pairs`} data={rows} fill="var(--nx-seriesA)" activeShape={false}
              shape={(props: unknown) => <Pair {...props as { payload?: Row }} />} {...motion} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  </StudioChartFrame>;
}
