'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, usePlotArea, useYAxisScale, type BarShapeProps, matchByDataKey } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneBarsDatum { id: string; label: string; value: number | null }
export interface NocturneBarsProps {
  data: readonly NocturneBarsDatum[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row extends NocturneBarsDatum { index: number }
const matchObservation = matchByDataKey('id');
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function RankedMark({ x, y, width, height, payload }: BarShapeProps) {
  const row = payload as Row;
  if (row.value === null || row.value === 0 || width <= 0 || height <= 0) return <g />;
  return <rect x={x} y={y} width={width} height={height} fill="var(--nx-seriesA)"
    style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }}
    data-nx-nocturne-bar={row.id} data-nx-value={row.value} />;
}

function RowReadings({ rows, format }: { rows: readonly Row[]; format: (value: number) => string }) {
  const scale = useYAxisScale(); const plot = usePlotArea();
  if (!scale || !plot) return null;
  return <g>
    {rows.map((row, index) => {
      const y = scale(row.index, { position: 'middle' });
      if (y === undefined) return null;
      return <g key={row.id} data-nx-nocturne-row={row.id}>
        <text x={0} y={y} dominantBaseline="central" fill="var(--nx-faint)" fontSize="var(--nx-type-axis-size)" className="tabular-nums">{String(index + 1).padStart(2, '0')}</text>
        <foreignObject x={26} y={y - 12} width={plot.x - 36} height={24}>
          <div className="flex h-full items-center text-[length:var(--nx-type-legend-size)] text-[var(--nx-ink)]">
            <span title={row.label} className="truncate">{row.label}</span>
          </div>
        </foreignObject>
        <foreignObject x={plot.x + plot.width + 8} y={y - 12} width={72} height={24}>
          <div className="flex h-full items-center justify-end text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] text-[var(--nx-ink)] tabular-nums">
            <span data-nx-nocturne-reading={row.id} title={row.value === null ? 'Unavailable' : format(row.value)} className="truncate">
              {row.value === null ? '—' : format(row.value)}
            </span>
          </div>
        </foreignObject>
      </g>;
    })}
  </g>;
}

/** Native horizontal bars ranked by value, with stable ties and unavailable rows last. */
export function NocturneBars({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Ranked category values' }: NocturneBarsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, maximum, valid } = useMemo(() => {
    const ids = new Set<string>(); let valid = true;
    const rows = data.map((datum, index) => {
      if (!datum.id.trim() || ids.has(datum.id)) valid = false;
      ids.add(datum.id);
      return { ...datum, index, value: datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 ? datum.value : null };
    }).sort((a, b) => a.value === null ? b.value === null ? a.index - b.index : 1
      : b.value === null ? -1 : b.value - a.value || a.index - b.index)
      .map((row, index): Row => ({ ...row, index }));
    return { rows, valid, maximum: rows.reduce((maximum, row) => Math.max(maximum, row.value ?? 0), 0) };
  }, [data]);
  const status = !valid ? 'Each category needs a unique, nonempty ID.'
    : !rows.length ? 'No categories to compare.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-bars" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    {!rows.some(row => row.value !== null) && <p role="status" className="sr-only">No observations available.</p>}
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div style={{ minWidth: 420, height: Math.max(150, rows.length * 40 + 28) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 228 }}>
          <BarChart data={rows} layout="vertical" accessibilityLayer title={label}
            desc={'Bars rank ' + unitLabel + ' from a common zero. Ties retain caller order; unavailable readings come last. Zero has a reading without a bar. Use left and right arrow keys to inspect rows.'}
            margin={{ top: 0, right: 86, bottom: 0, left: 138 }} maxBarSize={8}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <XAxis type="number" domain={[0, maximum || 1]} height={28} tickCount={4} tickMargin={10} axisLine={false} tickLine={false}
              tickFormatter={value => compact.format(Number(value))}
              tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="index" type="category" scale="band" hide />
            <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
              const row = typeof index === 'number' ? rows[index] : undefined;
              return active && row ? <NocturneChartTooltip title={row.label}>{row.value === null ? 'Unavailable' : valueFormatter(row.value) + ' ' + unitLabel}</NocturneChartTooltip> : null;
            }} />
            <Bar id={id + '-bars'} dataKey="value" name={unitLabel} fill="var(--nx-seriesA)" stroke="none" activeBar={false}
              shape={RankedMark} {...motion} animationMatchBy={matchObservation} />
            <RowReadings rows={rows} format={valueFormatter} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </NocturneChartFrame>;
}
