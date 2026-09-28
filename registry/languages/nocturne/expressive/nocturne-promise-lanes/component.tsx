'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, usePlotArea, useXAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { scatterFade } from '../../../../_shared/scatter-fade';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export type NocturnePromiseInterval = readonly [start: number, end: number];
export interface NocturnePromiseDatum {
  id: string; label: string;
  planned: NocturnePromiseInterval | null; actual: NocturnePromiseInterval | null;
}
export interface NocturnePromiseLanesProps {
  data: readonly NocturnePromiseDatum[];
  unitLabel?: string; contextLabel?: string;
  valueFormatter?: (value: number) => string; deltaFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Lane extends NocturnePromiseDatum { index: number; x: number; changes: [number, number, number] | null; opacity?: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => number.format(value);
const formatDelta = (value: number) => (value > 0 ? '+' : '') + number.format(value);
const matchLane = matchByDataKey('id');
function interval(value: NocturnePromiseInterval | null): NocturnePromiseInterval | null {
  return value?.length === 2 && value.every(Number.isFinite) && value[1] >= value[0] && Number.isFinite(value[1] - value[0]) ? value : null;
}

function PairedIntervals({ payload, cy, format }: { payload?: Lane; cy?: number; format: (value: number) => string }) {
  const scale = useXAxisScale(); const plot = usePlotArea();
  if (!payload || cy === undefined || !scale || !plot) return <g />;
  const plan = payload.planned?.map(value => scale(value)); const actual = payload.actual?.map(value => scale(value));
  const complete = (values: (number | undefined)[] | undefined): values is number[] => !!values && values.every(value => value !== undefined && Number.isFinite(value));
  return <g data-nx-promise-lane={payload.id} opacity={payload.opacity ?? 1}>
    <rect x={0} y={cy - 24} width={plot.x + plot.width + 162} height={48} fill="transparent" />
    <foreignObject x={0} y={cy - 12} width={plot.x - 16} height={24}>
      <div className="flex h-full items-center text-[length:var(--nx-type-legend-size)] text-[var(--nx-ink)]"><span className="truncate" title={payload.label}>{payload.label}</span></div>
    </foreignObject>
    {complete(plan) && complete(actual) && <g stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)">
      <line data-nx-promise-link="start" x1={plan[0]} x2={actual[0]} y1={cy - 4} y2={cy + 4} />
      <line data-nx-promise-link="end" x1={plan[1]} x2={actual[1]} y1={cy - 4} y2={cy + 4} />
    </g>}
    {complete(plan) && (plan[0] === plan[1]
      ? <line data-nx-promise-plan={payload.id} x1={plan[0]} x2={plan[0]} y1={cy - 13} y2={cy - 3} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-mark)" />
      : <rect data-nx-promise-plan={payload.id} x={plan[0]} y={cy - 12} width={plan[1]! - plan[0]!} height={8} fill="none" stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }} />)}
    {complete(actual) && (actual[0] === actual[1]
      ? <line data-nx-promise-actual={payload.id} x1={actual[0]} x2={actual[0]} y1={cy + 3} y2={cy + 13} stroke="var(--nx-seriesA)" strokeWidth="var(--nx-stroke-mark)" />
      : <rect data-nx-promise-actual={payload.id} x={actual[0]} y={cy + 4} width={actual[1]! - actual[0]!} height={8} fill="var(--nx-seriesA)" style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }} />)}
    {!plan && !actual && <text x={plot.x + 6} y={cy} dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-caption-size)">Unavailable</text>}
    {[0, 1, 2].map(index => <foreignObject key={index} x={plot.x + plot.width + 12 + index * 50} y={cy - 12} width={46} height={24}>
      <div className="flex h-full items-center justify-end text-[length:var(--nx-type-caption-size)] text-[var(--nx-ink)] tabular-nums">
        <span data-nx-promise-change={['start', 'end', 'duration'][index]} className="truncate" title={payload.changes ? format(payload.changes[index]!) : 'Unavailable'}>{payload.changes ? format(payload.changes[index]!) : '—'}</span>
      </div>
    </foreignObject>)}
  </g>;
}

function ChangeHeadings() {
  const plot = usePlotArea();
  return plot && <g>{['Start Δ', 'End Δ', 'Span Δ'].map((text, index) =>
    <text key={text} x={plot.x + plot.width + 58 + index * 50} y={14} textAnchor="end" fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)">{text}</text>)}</g>;
}

/** Two intervals share a native numeric scale; start, finish and duration changes remain independent. */
export function NocturnePromiseLanes({ data, unitLabel = 'Timeline', contextLabel, valueFormatter = formatNumber, deltaFormatter = formatDelta,
  width, height, animate = true, className, 'aria-label': label = 'Planned and actual intervals' }: NocturnePromiseLanesProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { lanes, domain, valid } = useMemo(() => {
    const valid = data.every(row => row.id.trim()) && new Set(data.map(row => row.id)).size === data.length;
    const lanes: Lane[] = data.map((row, index) => {
      const planned = interval(row.planned); const actual = interval(row.actual);
      const changes: [number, number, number] | null = planned && actual
        ? [actual[0] - planned[0], actual[1] - planned[1], (actual[1] - actual[0]) - (planned[1] - planned[0])] : null;
      return { id: row.id, label: row.label, index, planned, actual, x: planned?.[0] ?? actual?.[0] ?? 0, changes: changes?.every(Number.isFinite) ? changes : null };
    });
    const domain = numericDomain(lanes.flatMap(row => [...(row.planned ?? []), ...(row.actual ?? [])]));
    // Unavailable rows use an inspection anchor within the domain, without a quantity mark.
    for (const row of lanes) if (!row.planned && !row.actual) row.x = domain?.[0] ?? 0;
    return { lanes, domain, valid };
  }, [data]);
  const status = !valid ? 'Each lane needs a unique, nonempty ID.' : !domain ? 'The coordinate span is too large to display.' : !lanes.length ? 'No intervals to compare.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-promise-lanes" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div style={{ minWidth: 600, height: Math.max(170, lanes.length * 54 + 58) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 704, height: 328 }}>
          <ScatterChart accessibilityLayer title={label} desc="Each lane shows an outlined planned interval above a filled actual interval. Connectors join corresponding endpoints. Signed differences are actual minus planned; duration is independent of start and finish shifts. A tick is zero duration; unavailable intervals have no mark. Use left and right arrow keys to inspect lanes."
            margin={{ top: 26, right: 166, bottom: 0, left: 128 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
            <XAxis dataKey="x" type="number" domain={domain ?? [0, 1]} padding={{ left: 8, right: 8 }} height={32} tickCount={5} tickMargin={10} axisLine={false} tickLine={false} tickFormatter={valueFormatter} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="index" type="number" reversed domain={[-0.5, lanes.length - 0.5]} hide />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Lane | undefined;
              return active && row ? <NocturneChartTooltip title={row.label}>
                <div>Planned: {row.planned ? row.planned.map(valueFormatter).join(' → ') : 'Unavailable'}</div>
                <div>Actual: {row.actual ? row.actual.map(valueFormatter).join(' → ') : 'Unavailable'}</div>
                {['Start', 'End', 'Duration'].map((text, index) => <div key={text}>{text} change: {row.changes ? deltaFormatter(row.changes[index]!) : 'Unavailable'}</div>)}
              </NocturneChartTooltip> : null;
            }} />
            <Scatter id={id + '-lanes'} data={lanes} fill="var(--nx-seriesA)" activeShape={false} shape={(props: unknown) => <PairedIntervals {...props as { payload?: Lane; cy?: number }} format={deltaFormatter} />} {...motion} animationMatchBy={matchLane} animationInterpolateFn={scatterFade} />
            <ChangeHeadings />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="mt-4 flex shrink-0 flex-wrap justify-between gap-3 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2 w-5 rounded-[var(--nx-radius-bar)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-muted)]" />Planned<span aria-hidden="true" className="ml-3 h-2 w-5 rounded-[var(--nx-radius-bar)] bg-[var(--nx-seriesA)]" />Actual</span>
      <span>Δ actual − planned · Tick: zero duration</span>
    </div>
  </NocturneChartFrame>;
}
