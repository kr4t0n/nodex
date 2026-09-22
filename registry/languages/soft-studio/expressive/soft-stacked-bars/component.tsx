'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { studioTone, type StudioTone } from '../../../../_shared/studio-categorical';
import { StudioChartFrame, StudioChartKey, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftStackedBarsSeries { id: string; label: string; tone?: StudioTone }
export interface SoftStackedBarsDatum { id: string; label: string; values: Readonly<Record<string, number | null>> }
export interface SoftStackedBarsProps {
  data: readonly SoftStackedBarsDatum[]; series: readonly SoftStackedBarsSeries[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row { id: string; label: string; index: number; values: (number | null)[]; total: number | null }
const tones: Record<StudioTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Segment({ x, y, width, height, payload, index, seriesId, paint }: BarShapeProps & { index: number; seriesId: string; paint: string }) {
  const row = payload as Row; const value = row.values[index];
  if (row.total === null || !value || width <= 0 || height <= 0) return <g />;
  // Each native segment retains its exact bounds. Rounding never adds a gap to the stack.
  return <rect x={x} y={y} width={width} height={height} fill={paint}
    style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }}
    data-nx-soft-stack={row.id} data-nx-series={seriesId} data-nx-value={value} />;
}

function Totals({ rows, format }: { rows: readonly Row[]; format: (value: number) => string }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  return <g>{rows.map(row => {
    const x = xScale?.(row.total ?? 0); const y = yScale?.(row.index, { position: 'middle' });
    return x === undefined || y === undefined ? null : <text key={row.id} x={x + 12} y={y} dominantBaseline="central"
      data-nx-soft-stack-total={row.id} fill="var(--nx-ink)" fontSize="var(--nx-type-plotValue-size)" fontWeight="var(--nx-type-plotValue-weight)">
      {row.total === null ? '—' : format(row.total)}
    </text>;
  })}</g>;
}

/** Absolute horizontal stacks share a zero baseline; incomplete totals remain unavailable. */
export function SoftStackedBars({ data, series, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Category totals by series' }: SoftStackedBarsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, keys, maximum, valid } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    const rows = data.map((datum, index): Row => {
      const values = series.map(item => { const value = datum.values[item.id]; return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; });
      const sum = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      const total = values.every(value => value !== null) && Number.isFinite(sum) ? sum : null;
      return { id: datum.id, label: datum.label, index, total, values: total === null ? values.map(() => null) : values };
    });
    return { rows, keys: series.map(item => ({ ...item, paint: tones[studioTone(item.id, item.tone)] })),
      maximum: Math.max(0, ...rows.map(row => row.total ?? 0)), valid: unique(data) && unique(series) };
  }, [data, series]);
  const status = !valid ? 'Categories and series each need unique, nonempty IDs.' : !series.length ? 'No series to compare.'
    : !rows.length ? 'No categories to compare.' : null;
  const labelWidth = Math.min(130, Math.max(64, ...rows.map(row => row.label.length * 7 + 12)));
  const totalWidth = Math.min(150, Math.max(48, ...rows.map(row => row.total === null ? 24 : valueFormatter(row.total).length * 9 + 20)));

  return <StudioChartFrame ref={ref} name="soft-stacked-bars" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <StudioChartKey items={keys} />
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-auto ${height === undefined ? '' : 'min-h-0 flex-1'}`}>
      <div className="overflow-clip" style={{ minWidth: 360, height: Math.max(224, rows.length * 44 + 40) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
          <BarChart data={rows} layout="vertical" accessibilityLayer title={label}
            desc={`Segment widths show ${unitLabel} stacked from zero. Any missing part makes its whole row unavailable. Zero has a total without a mark. Use left and right arrow keys to inspect categories.`}
            margin={{ top: 2, right: totalWidth, bottom: 4, left: 0 }} maxBarSize={26} barCategoryGap="36%"
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
            <XAxis type="number" domain={[0, maximum || 1]} height={34} tickCount={4} tickMargin={12} axisLine={false} tickLine={false}
              tickFormatter={(value: number) => compact.format(value)} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="index" type="category" scale="band" interval={0} width={labelWidth} tickMargin={12} axisLine={false} tickLine={false}
              tickFormatter={(index: number) => rows[index]?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
              const row = typeof index === 'number' ? rows[index] : undefined;
              return active && row ? <StudioChartTooltip title={row.label}>{row.total === null ? 'Unavailable' : <>
                {keys.map((item, index) => <div key={item.id}>{item.label}: {valueFormatter(row.values[index]!)}</div>)}
                <div className="mt-1 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-1">{valueFormatter(row.total)} {unitLabel}</div>
              </>}</StudioChartTooltip> : null;
            }} />
            {keys.map((item, index) => <Bar key={item.id} id={`${id}-${index}`} dataKey={(row: Row) => row.values[index] ?? null} name={item.label}
              stackId={`${id}-stack`} fill={item.paint} stroke="none" activeBar={false}
              shape={(props: BarShapeProps) => <Segment {...props} index={index} seriesId={item.id} paint={item.paint} />} {...motion} />)}
            <Totals rows={rows} format={valueFormatter} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </StudioChartFrame>;
}
