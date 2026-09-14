'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface TrendLineageEvent { year: number | null; kind: 'shipped' | 'reworked' }
export interface TrendLineageDatum { name: string; events: readonly TrendLineageEvent[]; alive: boolean }
export interface TrendLineageProps {
  data: readonly TrendLineageDatum[];
  years: readonly [first: number, last: number];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface LifeEvent { year: number; kind: 'shipped' | 'reworked'; name: string; column: number; id: string }
interface FeatureColumn { name: string; alive: boolean; column: number; events: LifeEvent[] }

function EventMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: LifeEvent };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <g data-nx-observation={payload.id} opacity={0.8}><circle data-nx-event={payload.kind} cx={cx} cy={cy} r={5.5}
    fill={payload.kind === 'shipped' ? 'var(--nx-ink)' : 'var(--nx-bg)'} stroke={payload.kind === 'reworked' ? 'var(--nx-ink)' : 'none'} strokeWidth="calc(var(--nx-stroke-mark) * 1.4)" /></g>;
}

function Lifelines({ columns, years, count }: { columns: readonly FeatureColumn[]; years: readonly [number, number]; count: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  const [first, last] = years; const baseline = last + 0.7;
  const step = Math.max(1, Math.ceil((last - first) / 100));
  const ticks = Array.from({ length: Math.floor((last - first) / step) + 1 }, (_, index) => first + index * step);
  const point = (x: number, y: number) => ({ x: xScale(x) ?? 0, y: yScale(y) ?? 0 });
  return <g pointerEvents="none" aria-hidden="true">
    {ticks.map((year, index) => <g key={year}>
      <Curve points={[point(-0.75, year), point(count - 0.25, year)]} type="linear" fill="none" stroke="var(--nx-plotGrid)" strokeWidth="calc(var(--nx-stroke-hairline) * 8 / 7)" />
      {(step === 1 ? year % 2 === 0 : index % 2 === 0) && <text x={(xScale(-0.75) ?? 0) - 6} y={yScale(year)} textAnchor="end" dominantBaseline="central" opacity={0.8}
        fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-axis-weight)">{year}</text>}
    </g>)}
    {columns.map((feature) => {
      const lastEvent = feature.events.at(-1); const x = xScale(feature.column) ?? 0;
      return <g key={feature.column}>
        {feature.events.slice(1).map((event, index) => {
          const previous = feature.events[index]!; const dormant = event.year - previous.year > 2;
          return <Curve key={event.id} data-nx-lifeline={dormant ? 'dormant' : 'active'} points={[point(feature.column, previous.year + 0.28), point(feature.column, event.year - 0.28)]}
            type="linear" fill="none" stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray={dormant ? '2 4' : undefined} />;
        })}
        {lastEvent && <>
          {feature.alive && <Curve data-nx-tail={feature.column} points={[point(feature.column, lastEvent.year + 0.28), point(feature.column, baseline)]} type="linear" fill="none" stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-mark)" />}
          <circle data-nx-terminal={feature.alive ? 'alive' : 'retired'} cx={x} cy={yScale(feature.alive ? baseline : lastEvent.year + 0.5)} r={feature.alive ? 3 : 1.6}
            fill={feature.alive ? 'var(--nx-ink)' : 'var(--nx-faint)'} opacity={0.8} />
        </>}
        <text transform={`translate(${x} ${(yScale(baseline + 0.45) ?? 0) + 6}) rotate(-38)`} textAnchor="end" dominantBaseline="central" opacity={0.8}
          fill={feature.alive ? 'var(--nx-markStrong)' : 'var(--nx-markQuiet)'} fontSize="calc(var(--nx-type-axis-size) * 6.8 / 8)" fontWeight="var(--nx-type-axis-weight)">{feature.name}</text>
      </g>;
    })}
  </g>;
}

/** One observation series owns events; guides and survival terminals never add inspection stops. */
export function TrendLineage({ data, years, height, width, animate = true, className = '', 'aria-label': label = 'Feature events and survival over time' }: TrendLineageProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const [first, last] = years;
  const validWindow = Number.isSafeInteger(first) && Number.isSafeInteger(last) && first <= last && Number.isSafeInteger(last - first);
  const { columns, events } = useMemo(() => {
    const columns = data.map((feature, column): FeatureColumn => {
      const valid = validWindow && feature.events.every((event) => event.year !== null && Number.isSafeInteger(event.year) && event.year >= first && event.year <= last && (event.kind === 'shipped' || event.kind === 'reworked'));
      const events = valid ? feature.events.map((event, index): LifeEvent => ({ year: event.year!, kind: event.kind, name: feature.name, column, id: `${column}:${index}` })).sort((a, b) => a.year - b.year) : [];
      return { name: feature.name, alive: feature.alive, column, events };
    });
    return { columns, events: columns.flatMap((feature) => feature.events) };
  }, [data, first, last, validWindow]);
  return <div ref={ref} className={`nx-trend-lineage flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="trend-lineage" data-nx-animated={motion.isAnimationActive}>
    {!events.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No events available.</div> : <div className={height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Years run downward. Filled events mark shipment and hollow events a rework. Dashed intervals exceed two quiet years; surviving features reach the window's end. Use the left and right arrow keys to inspect events."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 20, right: 22, bottom: 62, left: 46 }}>
          <XAxis dataKey="column" type="number" hide domain={[-0.9, data.length - 0.2]} />
          <YAxis dataKey="year" type="number" hide reversed domain={[first - 0.7, last + 2.3]} />
          <Lifelines columns={columns} years={years} count={data.length} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const event = payload?.[0]?.payload as LifeEvent | undefined;
            return active && event ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{event.name} — {event.kind} {event.year}</div> : null;
          }} />
          <Scatter id={`${id}-events`} data={events} name="Feature events" fill="var(--nx-ink)" shape={EventMark} activeShape={EventMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
