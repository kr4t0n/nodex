'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { NeoChartFrame, NeoChartTooltip } from '../../../../_shared/neo-chart-frame';

export interface TwinPinsDatum { id: string; label: string; before: number | null; after: number | null }
export interface TwinPinsProps {
  data: readonly TwinPinsDatum[]; unitLabel?: string; contextLabel?: string; beforeLabel?: string; afterLabel?: string;
  valueFormatter?: (value: number) => string; width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row extends TwinPinsDatum { index: number; x: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => number.format(value);
const clean = (value: number | null) => value !== null && Number.isFinite(value) ? value : null;

function PairMark({ payload, format }: { payload?: Row; format: (value: number) => string }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const y = yScale?.(payload?.index);
  if (!payload || !xScale || y === undefined) return <g />;
  const before = payload.before === null ? undefined : xScale(payload.before);
  const after = payload.after === null ? undefined : xScale(payload.after);
  return <g data-nx-pair={payload.id}>
    {before !== undefined && after !== undefined && <line data-nx-pair-rail={payload.id} x1={before} x2={after} y1={y} y2={y} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" />}
    {before !== undefined && <circle data-nx-pin-before={payload.id} cx={before} cy={y} r={8} fill="var(--nx-seriesA)" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" />}
    {after !== undefined && <rect data-nx-pin-after={payload.id} x={after - 8} y={y - 8} width={16} height={16} fill="var(--nx-seriesB)" stroke="var(--nx-ink)"
      style={{ strokeWidth: 'var(--nx-stroke-mark)', filter: 'drop-shadow(var(--nx-shadow-badge) var(--nx-ink))' }} />}
    {before !== undefined && <text x={before} y={y - 17} textAnchor="middle" fill="var(--nx-ink)" fontSize="var(--nx-type-caption-size)" fontWeight="var(--nx-font-weight-bold)">{format(payload.before!)}</text>}
    {after !== undefined && <text x={after} y={y + 27} textAnchor="middle" fill="var(--nx-ink)" fontSize="var(--nx-type-caption-size)" fontWeight="var(--nx-font-weight-bold)">{format(payload.after!)}</text>}
    {before === undefined && after === undefined && <text x={xScale(0)} y={y} dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-control-size)">—</text>}
  </g>;
}

/** One library observation per row; circle and square stay distinguishable without color. */
export function TwinPins({ data, unitLabel = 'Value', contextLabel, beforeLabel = 'Before', afterLabel = 'After', valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Before and after values' }: TwinPinsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((datum, index): Row => {
    const before = clean(datum.before); const after = clean(datum.after);
    return { ...datum, before, after, index, x: before ?? after ?? 0 };
  }), [data]);
  const validIds = rows.every(row => row.id.trim()) && new Set(rows.map(row => row.id)).size === rows.length;
  const values = rows.flatMap(row => [row.before, row.after].filter(value => value !== null));
  const minimum = Math.min(0, ...values); const maximum = Math.max(0, ...values);
  const status = !validIds ? 'Each row needs a unique, nonempty ID.' : !values.length ? 'No paired observations available.' : null;
  return <NeoChartFrame ref={ref} name="twin-pins" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap gap-6 text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)]">
      <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-seriesA)]" />{beforeLabel}</span>
      <span className="flex items-center gap-2"><span className="h-4 w-4 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-seriesB)]" />{afterLabel}</span>
    </div>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-auto ${height === undefined ? '' : 'min-h-0 flex-1'}`}>
      <div style={{ minWidth: 390, height: Math.max(310, rows.length * 76 + 50) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 355 }}>
          <ScatterChart accessibilityLayer title={label} desc="Circles show the first reading; squares show the second. Their distance is the change on one common scale. Missing endpoints have no mark or connecting line. Use left and right arrow keys to inspect rows."
            margin={{ top: 26, right: 28, bottom: 8, left: 0 }} className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
            <XAxis dataKey="x" type="number" domain={[minimum, maximum || (minimum === 0 ? 1 : 0)]} padding={{ left: 14, right: 14 }} height={30} tickCount={4} tickLine={false}
              axisLine={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)' }} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="index" type="number" reversed domain={[-0.5, rows.length - 0.5]} ticks={rows.map(row => row.index)} interval={0} width={88} axisLine={false} tickLine={false}
              tickFormatter={(index: number) => rows[index]?.label ?? ''} tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-font-weight-bold)' }} />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Row | undefined;
              return active && row ? <NeoChartTooltip title={row.label}><div>{beforeLabel}: {row.before === null ? 'Unavailable' : valueFormatter(row.before)}</div><div>{afterLabel}: {row.after === null ? 'Unavailable' : valueFormatter(row.after)}</div></NeoChartTooltip> : null;
            }} />
            <Scatter id={`${id}-pairs`} data={rows} fill="var(--nx-ink)" shape={(props: unknown) => <PairMark {...props as { payload?: Row }} format={valueFormatter} />} activeShape={(props: unknown) => <PairMark {...props as { payload?: Row }} format={valueFormatter} />} {...motion} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  </NeoChartFrame>;
}
