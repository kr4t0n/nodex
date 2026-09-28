'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneControlDatum { id: string; label: string; x: number; value: number | null }
export interface NocturneControlLimits { lower: number; center: number; upper: number }
export interface NocturneControlEvent { id: string; x: number; label: string }
export interface NocturneControlProps {
  data: readonly NocturneControlDatum[]; limits: NocturneControlLimits | null;
  events?: readonly NocturneControlEvent[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row extends NocturneControlDatum { outside: 'above' | 'below' | null }
const noEvents: readonly NocturneControlEvent[] = [];
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);
const matchObservation = matchByDataKey('id');
const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;

function ControlPoint(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Row };
  if (!payload || payload.value === null || cx === undefined || cy === undefined) return <g />;
  return <circle data-nx-control-point={payload.id} data-nx-control-outside={payload.outside ?? 'false'} cx={cx} cy={cy} r={payload.outside ? 4 : 2.5}
    fill={payload.outside ? 'var(--nx-surfaceFill)' : 'var(--nx-ink)'} stroke={payload.outside ? 'var(--nx-seriesC)' : 'var(--nx-ink)'} strokeWidth={payload.outside ? 'var(--nx-stroke-mark)' : 'var(--nx-stroke-hairline)'} />;
}

/** Only strict point breaches are classified; no process model or run rule is inferred. */
export function NocturneControl({ data, limits, events = noEvents, unitLabel = 'Process observations', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Process observations against supplied statistical control limits' }: NocturneControlProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, bounds, xDomain, yDomain, validIds, validX, validEvents } = useMemo(() => {
    const bounds = limits && [limits.lower, limits.center, limits.upper].every(Number.isFinite) && limits.lower <= limits.center && limits.center <= limits.upper ? limits : null;
    const rows: Row[] = data.map(row => {
      const value = row.value !== null && Number.isFinite(row.value) ? row.value : null;
      return { ...row, value, outside: bounds && value !== null ? value < bounds.lower ? 'below' : value > bounds.upper ? 'above' : null : null };
    });
    return { rows, bounds, validIds: unique(data) && unique(events),
      validX: rows.every((row, i) => Number.isFinite(row.x) && (!i || row.x > rows[i - 1]!.x)),
      validEvents: events.every(event => Number.isFinite(event.x) && data.length > 0 && event.x >= data[0]!.x && event.x <= data.at(-1)!.x),
      xDomain: numericDomain(rows.map(row => row.x)),
      yDomain: numericDomain([...rows.flatMap(row => row.value === null ? [] : [row.value]), ...(bounds ? [bounds.lower, bounds.center, bounds.upper] : [])]) };
  }, [data, limits, events]);
  const status = !validIds ? 'Observations and events each need unique, nonempty IDs.' : !validX ? 'X coordinates must be finite and strictly increasing.'
    : !validEvents ? 'Events need finite X coordinates inside the supplied observation window.' : !xDomain || !yDomain ? 'The coordinate span is too large to display.' : !rows.length ? 'No process observations supplied.' : null;
  const outside = rows.filter(row => row.outside).length; const available = rows.filter(row => row.value !== null).length;
  return <NocturneChartFrame ref={ref} name="nocturne-control" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(460, rows.length * 28 + 64), height: 270 }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 654, height: 270 }}>
            <LineChart data={rows} accessibilityLayer title={label} desc="The signal uses a numeric time axis. Dashed limits and the center line are supplied statistical references, not business targets. Amber outlined points are strictly outside the supplied limits; equality is not a breach. Missing readings break the line. No sequence rules or overall stability verdict are inferred. Use left and right arrow keys to inspect observations."
              margin={{ top: 20, right: 16, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
              <XAxis type="number" dataKey="x" domain={xDomain ?? [0, 1]} ticks={rows.map(row => row.x)} minTickGap={24} height={34} tickMargin={12} padding={{ left: 6, right: 6 }} axisLine={false} tickLine={false}
                tickFormatter={x => { const text = rows.find(row => row.x === x)?.label ?? ''; return text.length > 12 ? text.slice(0, 11) + '…' : text; }} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              <YAxis domain={yDomain ?? [0, 1]} width={48} tickCount={4} padding={{ top: 16, bottom: 12 }} axisLine={false} tickLine={false} tickFormatter={value => compact.format(value)} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              {bounds && <>
                <ReferenceArea y1={bounds.lower} y2={bounds.upper} fill="var(--nx-seriesA)" fillOpacity={0.06} stroke="none" />
                <ReferenceLine y={bounds.lower} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
                <ReferenceLine y={bounds.center} stroke="var(--nx-seriesA)" strokeWidth="var(--nx-stroke-hairline)" />
                <ReferenceLine y={bounds.upper} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
              </>}
              {events.map((event, index) => <ReferenceLine key={event.id} x={event.x} stroke="var(--nx-border)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5"
                label={{ value: String(index + 1), position: 'insideTopLeft', fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-caption-size)' }} />)}
              <Line id={id + '-signal'} dataKey="value" name={unitLabel} type="linear" connectNulls={false} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" dot={ControlPoint} activeDot={false} {...motion} animationMatchBy={matchObservation} />
              <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '3 4' }} content={({ active, label: x }) => {
                const row = rows.find(row => row.x === x);
                return active && row ? <NocturneChartTooltip title={row.label}>
                  <div>Observed: {row.value === null ? 'Unavailable' : valueFormatter(row.value)}</div>
                  <div>{!bounds ? 'Control limits unavailable' : row.value === null ? 'No limit comparison' : row.outside ? (row.outside === 'above' ? 'Above upper' : 'Below lower') + ' control limit' : 'Within supplied limits'}</div>
                  {bounds && <><div>Lower: {valueFormatter(bounds.lower)}</div><div>Center: {valueFormatter(bounds.center)}</div><div>Upper: {valueFormatter(bounds.upper)}</div></>}
                  {events.filter(event => event.x === row.x).map(event => <div key={event.id}>{event.label}</div>)}
                </NocturneChartTooltip> : null;
              }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <dl className="mt-4 mb-0 flex flex-wrap gap-x-8 gap-y-3 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-4">
        {(['lower', 'center', 'upper'] as const).map(key => <div key={key} className="min-w-0"><dt className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{key === 'center' ? 'Center' : key === 'lower' ? 'Lower control limit' : 'Upper control limit'}</dt><dd data-nx-control-limit={key} className="mt-1 ml-0 break-all text-[length:var(--nx-type-plotValue-size)] tabular-nums">{bounds ? valueFormatter(bounds[key]) : '—'}</dd></div>)}
      </dl>
      <p data-nx-control-count className="mt-3 mb-0 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{bounds ? outside + ' outside limits · ' + available + ' measured' : 'Control limits unavailable · ' + available + ' measured'}{available < rows.length ? ' · ' + (rows.length - available) + ' unavailable' : ''}</p>
      {events.length > 0 && <ol className="mt-3 mb-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{events.map((event, index) => <li key={event.id} className="min-w-0 break-words" data-nx-control-event={event.id}>{index + 1}. {event.label}</li>)}</ol>}
    </div>
  </NocturneChartFrame>;
}
