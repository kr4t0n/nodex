'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { neoCategoryTone, type NeoCategoryTone } from '../../../../_shared/neo-categorical';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface StackedBlocksSeries { id: string; label: string; tone?: NeoCategoryTone }
export interface StackedBlocksDatum {
  id: string;
  label: string;
  /** One nonnegative reading per series ID. Any missing/invalid part makes the row unavailable. */
  values: Readonly<Record<string, number | null>>;
}
export interface StackedBlocksProps {
  data: readonly StackedBlocksDatum[];
  series: readonly StackedBlocksSeries[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Row { id: string; label: string; index: number; values: readonly (number | null)[]; total: number | null }
const tones: Record<NeoCategoryTone, string> = {
  a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)',
};
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);

function StackBlock({ x, y, width, height, payload, seriesIndex, fill, seriesId, formatValue }: BarShapeProps & {
  seriesIndex: number; fill: string; seriesId: string; formatValue: (value: number) => string;
}) {
  const row = payload as Row;
  const value = row.values[seriesIndex];
  if (row.total === null || !value || width <= 0) return null;
  const text = formatValue(value);
  return <g>
    <Rectangle x={x} y={y} width={width} height={height} radius={0} fill={fill} stroke="var(--nx-ink)"
      style={{ strokeWidth: 'var(--nx-stroke-hairline)', filter: 'drop-shadow(var(--nx-shadow-badge) var(--nx-ink))' }}
      data-nx-stack={row.id} data-nx-series={seriesId} data-nx-value={value} />
    {width > Math.max(40, text.length * 9 + 16) && <text x={x + width / 2} y={y + height / 2} dominantBaseline="central" textAnchor="middle"
      fill="var(--nx-ink)" fontSize="var(--nx-type-control-size)" fontWeight="var(--nx-font-weight-bold)" pointerEvents="none">{text}</text>}
  </g>;
}

/** Labels use public scales so zero and unavailable stacks remain visible. */
function StackTotals({ rows, format }: { rows: readonly Row[]; format: (value: number) => string }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  return <g pointerEvents="none">{rows.map(row => {
    const x = xScale?.(row.total ?? 0);
    const y = yScale?.(row.index, { position: 'middle' });
    return x === undefined || y === undefined ? null : <text key={row.id} data-nx-stack-total={row.id} x={x + 12} y={y} dominantBaseline="central"
      fill="var(--nx-ink)" fontSize="var(--nx-type-control-size)" fontWeight="var(--nx-font-weight-bold)">{row.total === null ? '—' : format(row.total)}</text>;
  })}</g>;
}

/** Absolute stacked magnitudes share one zero baseline and retain caller order. */
export function StackedBlocks({ data, series, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className = '', 'aria-label': label = 'Values by category and series' }: StackedBlocksProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { rows, maximum, validIds } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    const rows = data.map((datum, index): Row => {
      const values = series.map(item => {
        const value = datum.values[item.id];
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
      });
      const sum = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      const total = values.every(value => value !== null) && Number.isFinite(sum) ? sum : null;
      return { id: datum.id, label: datum.label, index, total, values: total === null ? values.map(() => null) : values };
    });
    return { rows, maximum: Math.max(0, ...rows.map(row => row.total ?? 0)), validIds: unique(data) && unique(series) };
  }, [data, series]);
  const status = !series.length ? 'No series to compare.' : !rows.length ? 'No categories to compare.'
    : !validIds ? 'Categories and series each need unique, nonempty IDs.'
    : !rows.some(row => row.total !== null) ? 'No complete observations available.' : null;
  const labelWidth = Math.min(120, Math.max(64, ...rows.map(row => row.label.length * 7 + 12)));
  const totalWidth = Math.min(150, Math.max(52, ...rows.map(row => row.total === null ? 24 : valueFormatter(row.total).length * 9 + 16)));

  return <div ref={ref} className={`flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="stacked-blocks" data-nx-animated={motion.isAnimationActive}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] pb-3 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] tracking-[var(--nx-type-label-tracking)] uppercase">
      <span>{unitLabel}</span>{contextLabel && <span className="text-[var(--nx-muted)]">{contextLabel}</span>}
    </div>
    <ul aria-label="Series key" className="mt-[var(--nx-space-cardBodyGap)] mb-0 flex list-none flex-wrap gap-x-5 gap-y-3 p-0">
      {series.map((item, index) => <li key={`${item.id}-${index}`} className="flex items-center gap-2 text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)]">
        <span data-nx-series-key={item.id} aria-hidden="true" className="h-4 w-4 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)]" style={{ background: tones[neoCategoryTone(item.id, item.tone)] }} />{item.label}
      </li>)}
    </ul>
    {status ? <div role="status" className="flex min-h-[240px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> :
      <div className={`mt-[var(--nx-space-cardBodyGap)] ${height === undefined ? 'w-full overflow-x-auto overflow-y-hidden' : 'min-h-0 flex-1 overflow-auto'}`}>
        {/* Keep library sizing overflow inside the plot; only the actual plot dimensions may scroll. */}
        <div className="overflow-clip" style={{ minWidth: 430, height: Math.max(280, rows.length * 64 + 48) }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 310 }}>
            <BarChart data={rows} layout="vertical" accessibilityLayer title={label}
              desc={`Segment widths show ${unitLabel}, stacked from a common zero baseline. A row with any missing segment is unavailable. Use left and right arrow keys to inspect categories.`}
              margin={{ top: 8, right: totalWidth, bottom: 4, left: 0 }} maxBarSize={38} barCategoryGap="24%"
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
              <XAxis type="number" domain={[0, maximum || 1]} tickCount={4} height={34} axisLine={false} tickLine={false} tickMargin={12}
                tickFormatter={(value: number) => compact.format(value)} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
              <YAxis dataKey="index" type="category" scale="band" interval={0} width={labelWidth} tickLine={false} tickMargin={12}
                tickFormatter={(index: number) => rows[index]?.label ?? ''} axisLine={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)' }}
                tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-font-weight-bold)' }} />
              <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
                const row = typeof index === 'number' ? rows[index] : undefined;
                return active && row ? <div role="status" className="max-w-[260px] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-bg)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)] [box-shadow:var(--nx-shadow-popover)_var(--nx-ink)]">
                  <div className="font-[number:var(--nx-font-weight-bold)]">{row.label}</div>
                  {row.total === null ? <div>Unavailable</div> : <>
                    {series.map((item, index) => <div key={item.id} className="flex justify-between gap-4"><span>{item.label}</span><span>{valueFormatter(row.values[index]!)}</span></div>)}
                    <div className="mt-1 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-1 font-[number:var(--nx-font-weight-bold)]">{valueFormatter(row.total)} {unitLabel}</div>
                  </>}
                </div> : null;
              }} />
              {series.map((item, index) => <Bar key={item.id} id={`${id}-${index}`} dataKey={(row: Row) => row.values[index] ?? null} name={item.label} stackId={`${id}-stack`}
                fill={tones[neoCategoryTone(item.id, item.tone)]} stroke="none" activeBar={false} {...motion}
                shape={(props: BarShapeProps) => <StackBlock {...props} seriesIndex={index} seriesId={item.id} fill={tones[neoCategoryTone(item.id, item.tone)]} formatValue={valueFormatter} />} />)}
              <StackTotals rows={rows} format={valueFormatter} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
  </div>;
}
