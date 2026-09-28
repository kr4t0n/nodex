'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale, matchByDataKey } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { nocturneTone, type NocturneTone } from '../../../../_shared/nocturne-categorical';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneLineSeries { id: string; label: string; tone?: NocturneTone }
export interface NocturneLineDatum {
  id: string; label: string; x: number;
  values: Readonly<Record<string, number | null>>;
}
export interface NocturneLineProps {
  data: readonly NocturneLineDatum[]; series: readonly NocturneLineSeries[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row { id: string; label: string; x: number; values: (number | null)[] }
interface Series extends NocturneLineSeries { paint: string }
const tones: Record<NocturneTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const matchObservation = matchByDataKey('id');
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Observation({ props, index, series }: { props: unknown; index: number; series: Series }) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Row };
  if (!payload || payload.values[index] === null || cx === undefined || cy === undefined || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
  return <circle cx={cx} cy={cy} r={2.5} fill={series.paint} stroke="none"
    data-nx-nocturne-point={payload.id} data-nx-series={series.id} />;
}

/** Endpoint labels are displaced only vertically; leaders retain the actual final reading. */
function EndLabels({ row, series }: { row: Row | undefined; series: readonly Series[] }) {
  const plot = usePlotArea(); const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!plot || !xScale || !yScale || !row) return null;
  const x = xScale(row.x);
  if (x === undefined) return null;
  const entries = series.flatMap((item, index) => {
    const value = row.values[index]; const y = value === null || value === undefined ? undefined : yScale(value);
    return y === undefined ? [] : [{ ...item, y, labelY: y }];
  }).sort((a, b) => a.y - b.y);
  const gap = 22; const top = plot.y + 8; const bottom = plot.y + plot.height - 8;
  entries.forEach((entry, index) => { entry.labelY = Math.max(entry.y, index ? entries[index - 1]!.labelY + gap : top); });
  if (entries.length && entries.at(-1)!.labelY > bottom) {
    entries.at(-1)!.labelY = bottom;
    for (let index = entries.length - 2; index >= 0; index--) entries[index]!.labelY = Math.min(entries[index]!.labelY, entries[index + 1]!.labelY - gap);
  }
  return <g>{entries.map(item => <g key={item.id} data-nx-nocturne-end={item.id}>
    <path d={'M' + (x + 5) + ',' + item.y + 'L' + (plot.x + plot.width + 12) + ',' + item.labelY}
      fill="none" stroke={item.paint} strokeWidth="var(--nx-stroke-hairline)" />
    <foreignObject x={plot.x + plot.width + 17} y={item.labelY - 10} width={102} height={20}>
      <div className="flex h-full items-center text-[length:var(--nx-type-legend-size)] font-[number:var(--nx-type-legend-weight)]" style={{ color: item.paint }}>
        <span data-nx-nocturne-end-label title={item.label} className="truncate">{item.label}</span>
      </div>
    </foreignObject>
  </g>)}</g>;
}

/** Straight native segments preserve actual intervals and independent missing-value gaps. */
export function NocturneLine({ data, series, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Series over time' }: NocturneLineProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, keys, minimum, maximum, validIds, validX } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    let minimum = 0; let maximum = 0;
    const rows: Row[] = data.map(datum => ({ id: datum.id, label: datum.label, x: datum.x, values: series.map(item => {
      const raw = datum.values[item.id]; const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
      if (value !== null) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }
      return value;
    }) }));
    return { rows, minimum, maximum, keys: series.map(item => ({ ...item, paint: tones[nocturneTone(item.id, item.tone)] })),
      validIds: unique(data) && unique(series),
      validX: rows.every((row, index) => Number.isFinite(row.x) && (!index || row.x > rows[index - 1]!.x)) };
  }, [data, series]);
  const status = !validIds ? 'Observations and series each need unique, nonempty IDs.'
    : !validX ? 'X coordinates must be finite and strictly increasing.' : !series.length ? 'No series to compare.'
    : !rows.some(row => row.values.some(value => value !== null)) ? 'No observations available.' : null;
  const last = rows.at(-1);
  return <NocturneChartFrame ref={ref} name="nocturne-line" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div style={{ minWidth: Math.max(460, rows.length * 40 + 180), height: Math.max(214, keys.length * 24 + 56) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 214 }}>
          <LineChart data={rows} accessibilityLayer title={label}
            desc={'Height shows ' + unitLabel + '; horizontal distance follows numeric X. Straight segments join supplied readings, and missing readings break each series. Endpoint labels and the key refer to the final supplied observation. Use left and right arrow keys to inspect observations.'}
            margin={{ top: 12, right: 122, bottom: 0, left: 0 }}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} ticks={rows.map(row => row.x)} minTickGap={24}
              height={30} tickMargin={10} axisLine={false} tickLine={false} padding={{ left: 5, right: 5 }}
              tickFormatter={(x: number) => rows.find(row => row.x === x)?.label ?? ''}
              tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis domain={[minimum, maximum || (minimum === 0 ? 1 : 0)]} width={40} tickCount={4} axisLine={false} tickLine={false}
              tickFormatter={(value: number) => compact.format(value)} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '3 4' }}
              content={({ active, label: x }) => {
                const row = rows.find(row => row.x === x);
                return active && row ? <NocturneChartTooltip title={row.label}>{keys.map((item, index) => <div key={item.id}>
                  {item.label}: {row.values[index] === null ? 'Unavailable' : valueFormatter(row.values[index]!) + ' ' + unitLabel}
                </div>)}</NocturneChartTooltip> : null;
              }} />
            {keys.map((item, index) => <Line key={item.id} id={id + '-' + index} dataKey={(row: Row) => row.values[index] ?? null}
              name={item.label} type="linear" connectNulls={false} fill="none" stroke={item.paint} strokeWidth="var(--nx-stroke-mark)" activeDot={false}
              dot={(props: unknown) => <Observation props={props} index={index} series={item} />} {...motion} animationMatchBy={matchObservation} />)}
            <EndLabels row={last} series={keys} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <ul aria-label={'Final readings' + (last ? ': ' + last.label : '')}
      className="mt-4 mb-0 flex shrink-0 list-none flex-wrap gap-x-8 gap-y-3 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] px-0 pt-4">
      {keys.map((item, index) => <li key={item.id} data-nx-nocturne-series={item.id} className="min-w-0">
        <div className="flex items-center gap-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.paint }} />
          <span className="break-words">{item.label}</span>
        </div>
        <div data-nx-nocturne-latest={item.id} className="mt-1 break-all text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] tabular-nums">
          {last?.values[index] === null || last?.values[index] === undefined ? '—' : valueFormatter(last.values[index])}
        </div>
      </li>)}
    </ul>
  </NocturneChartFrame>;
}
