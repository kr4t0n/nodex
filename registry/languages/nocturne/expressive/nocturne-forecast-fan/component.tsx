'use client';

import { useId, useMemo } from 'react';
import { Area, AreaRevealShape, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey, useYAxisScale, type AnimationInterpolateFn, type AreaPointItem, type AreaRevealShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneForecastBand { id: string; /** Coverage probability, strictly between zero and one. */ coverage: number }
export type NocturneForecastDatum = { id: string; label: string; x: number; value: number | null } & (
  | { kind: 'observed' }
  | { kind: 'forecast'; intervals: Readonly<Record<string, readonly [lower: number, upper: number] | null>> }
);
export interface NocturneForecastFanProps {
  data: readonly NocturneForecastDatum[]; bands: readonly NocturneForecastBand[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row { id: string; label: string; x: number; kind: 'observed' | 'forecast'; value: number | null; actual: number | null; forecast: number | null; intervals: ([number, number] | null)[]; crossed: boolean; opacity?: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumSignificantDigits: 4 });
const formatNumber = (value: number) => number.format(value);
const matchObservation = matchByDataKey('id');
const clean = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
const fadeIntervals: AnimationInterpolateFn<AreaPointItem, 'horizontal' | 'vertical'> = (items, progress) =>
  (items ?? []).flatMap(item => item.status === 'removed' ? [] : [{ ...item.next, payload: { ...item.next.payload, opacity: progress } }]);

function IntervalCaps({ x, upper, lower, band }: { x: number; upper: number; lower: number; band: string }) {
  return <g data-nx-forecast-isolated={band} stroke="var(--nx-seriesA)" strokeWidth="var(--nx-stroke-hairline)">
    <line x1={x} x2={x} y1={upper} y2={lower} />
    <line x1={x - 3} x2={x + 3} y1={upper} y2={upper} />
    {upper !== lower && <line x1={x - 3} x2={x + 3} y1={lower} y2={lower} />}
  </g>;
}

/** Recharts skips Area.shape for a one-row dataset; its native dot still renders. */
function SingleInterval({ props, index, band }: { props: unknown; index: number; band: string }) {
  const scale = useYAxisScale();
  const { cx, cy, payload, points } = props as { cx?: number; cy?: number; payload?: Row; points?: readonly unknown[] };
  const interval = payload?.intervals[index]; const lower = interval && scale ? scale(interval[0]) : undefined;
  if (points?.length !== 1 || !interval || cx === undefined || cy === undefined || lower === undefined) return <g />;
  return <g opacity={payload?.opacity ?? 1}><IntervalCaps x={cx} upper={cy} lower={lower} band={band} /></g>;
}

/** Native range geometry also exposes isolated intervals, which have no filled area. */
function IntervalBand({ props, band }: { props: AreaRevealShapeProps; band: NocturneForecastBand }) {
  const points = props.points ?? []; const baseline = Array.isArray(props.baseLine) ? props.baseLine : [];
  const present = (index: number) => Number.isFinite(points[index]?.x) && Number.isFinite(points[index]?.y) && Number.isFinite(baseline[index]?.y);
  return <g data-nx-forecast-band={band.id} opacity={props.isAnimating ? props.animationElapsedTime : 1}>
    <AreaRevealShape {...props} isEntrance={false} />
    {points.map((point, index) => present(index) && !present(index - 1) && !present(index + 1)
      ? <IntervalCaps key={index} x={point.x!} upper={point.y!} lower={baseline[index]!.y} band={band.id} /> : null)}
  </g>;
}

function ForecastPoint({ props, kind }: { props: unknown; kind: Row['kind'] }) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Row };
  if (!payload || payload.kind !== kind || payload.value === null || cx === undefined || cy === undefined) return <g />;
  return <circle data-nx-forecast-point={payload.id} data-nx-forecast-kind={kind} cx={cx} cy={cy} r={3}
    fill={kind === 'observed' ? 'var(--nx-ink)' : 'var(--nx-surfaceFill)'} stroke={kind === 'observed' ? 'var(--nx-ink)' : 'var(--nx-seriesA)'} strokeWidth="var(--nx-stroke-hairline)" />;
}

/** The caller owns forecasts and prediction intervals; this component never fits a model. */
export function NocturneForecastFan({ data, bands, unitLabel = 'Forecast', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Observed values and forecasts with prediction intervals' }: NocturneForecastFanProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, orderedBands, validIds, validBands, validX, validPhases, xDomain, yDomain, boundary, unavailable } = useMemo(() => {
    const orderedBands = [...bands].sort((a, b) => b.coverage - a.coverage);
    const bandIds = new Set(bands.map(band => band.id));
    const validBands = bands.every(band => Number.isFinite(band.coverage) && band.coverage > 0 && band.coverage < 1)
      && new Set(bands.map(band => band.coverage)).size === bands.length
      && data.every(row => row.kind === 'observed' || Object.keys(row.intervals).every(key => bandIds.has(key)));
    const firstForecast = data.findIndex(row => row.kind === 'forecast');
    const lastObserved = firstForecast < 0 ? data.length - 1 : firstForecast - 1;
    const rows: Row[] = data.map((row, index) => {
      const value = clean(row.value);
      let intervals: Row['intervals'] = orderedBands.map(band => {
        const interval = row.kind === 'forecast' ? row.intervals[band.id] : null;
        return interval?.length === 2 && interval.every(Number.isFinite) && interval[0] <= interval[1] && Number.isFinite(interval[1] - interval[0]) ? [interval[0], interval[1]] : null;
      });
      const available = intervals.filter((interval): interval is [number, number] => interval !== null);
      const crossed = available.some((interval, i) => i > 0 && (interval[0] < available[i - 1]![0] || interval[1] > available[i - 1]![1]));
      if (crossed) intervals = intervals.map(() => null);
      return { id: row.id, label: row.label, x: row.x, kind: row.kind, value, actual: row.kind === 'observed' ? value : null,
        forecast: row.kind === 'forecast' || (firstForecast >= 0 && index === lastObserved) ? value : null, intervals, crossed };
    });
    return { rows, orderedBands, validIds: unique(data) && unique(bands), validBands,
      validX: data.every((row, i) => Number.isFinite(row.x) && (!i || row.x > data[i - 1]!.x)),
      validPhases: firstForecast < 0 || data.slice(firstForecast).every(row => row.kind === 'forecast'),
      xDomain: numericDomain(rows.map(row => row.x)), yDomain: numericDomain(rows.flatMap(row => [...(row.value === null ? [] : [row.value]), ...row.intervals.flatMap(interval => interval ?? [])])),
      boundary: firstForecast < 0 ? undefined : rows[lastObserved]?.x ?? rows[firstForecast]?.x,
      unavailable: rows.filter(row => row.kind === 'forecast').reduce((count, row) => count + row.intervals.filter(interval => !interval).length, 0) };
  }, [data, bands]);
  const status = !validIds ? 'Observations and bands each need unique, nonempty IDs.' : !validBands ? 'Declare distinct coverage probabilities between zero and one, and use only declared band IDs.'
    : !validX ? 'X coordinates must be finite and strictly increasing.' : !validPhases ? 'Observed values must precede all forecasts.'
      : !xDomain || !yDomain ? 'The coordinate span is too large to display.' : !rows.length ? 'No observations or forecasts supplied.' : null;
  const final = rows.at(-1);
  return <NocturneChartFrame ref={ref} name="nocturne-forecast-fan" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(480, rows.length * 36 + 70), height: 280 }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 654, height: 280 }}>
            <ComposedChart data={rows} accessibilityLayer title={label} desc="Solid history precedes the dashed forecast. Shaded ranges are caller-supplied prediction intervals, with explicit coverage probabilities. Gaps remain unavailable. No model, interval or forecast is estimated. Use left and right arrow keys to inspect each supplied observation."
              margin={{ top: 20, right: 16, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
              <XAxis type="number" dataKey="x" domain={xDomain ?? [0, 1]} ticks={rows.map(row => row.x)} minTickGap={24} height={34} tickMargin={12} padding={{ left: 6, right: 6 }} axisLine={false} tickLine={false}
                tickFormatter={x => { const text = rows.find(row => row.x === x)?.label ?? ''; return text.length > 12 ? text.slice(0, 11) + '…' : text; }} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              <YAxis domain={yDomain ?? [0, 1]} width={48} tickCount={4} padding={{ top: 12, bottom: 12 }} axisLine={false} tickLine={false} tickFormatter={value => compact.format(value)} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              {boundary !== undefined && <ReferenceLine x={boundary} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="3 4" label={{ value: 'Forecast →', position: 'insideTopRight', fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-caption-size)' }} />}
              {orderedBands.map((band, index) => <Area key={band.id} id={id + '-band-' + index} name={percent.format(band.coverage)} dataKey={(row: Row) => row.intervals[index] ?? null}
                type="linear" connectNulls={false} fill="var(--nx-seriesA)" fillOpacity={0.12} stroke="var(--nx-seriesA)" strokeOpacity={0.45} strokeWidth="var(--nx-stroke-hairline)" activeDot={false}
                dot={props => <SingleInterval props={props} index={index} band={band.id} />}
                shape={props => <IntervalBand props={props} band={band} />} {...motion} animationMatchBy={matchObservation} animationInterpolateFn={fadeIntervals} />)}
              <Line id={id + '-actual'} dataKey="actual" name="Observed" type="linear" connectNulls={false} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" activeDot={false}
                dot={props => <ForecastPoint props={props} kind="observed" />} {...motion} animationMatchBy={matchObservation} />
              <Line id={id + '-forecast'} dataKey="forecast" name="Forecast" type="linear" connectNulls={false} stroke="var(--nx-seriesA)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="5 4" activeDot={false}
                dot={props => <ForecastPoint props={props} kind="forecast" />} {...motion} animationMatchBy={matchObservation} />
              <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '3 4' }} content={({ active, label: x }) => {
                const row = rows.find(row => row.x === x);
                return active && row ? <NocturneChartTooltip title={row.label}>
                  <div>{row.kind === 'observed' ? 'Observed' : 'Forecast'}: {row.value === null ? 'Unavailable' : valueFormatter(row.value)}</div>
                  {row.kind === 'forecast' && orderedBands.map((band, i) => <div key={band.id}>{percent.format(band.coverage)} interval: {row.intervals[i]?.map(valueFormatter).join(' → ') ?? 'Unavailable'}</div>)}
                  {row.crossed && <div>Intervals must be nested by coverage.</div>}
                </NocturneChartTooltip> : null;
              }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-4 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-4 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
        <div className="min-w-0"><div>Final {final?.kind === 'forecast' ? 'forecast' : 'observation'} · {final?.label}</div><div data-nx-forecast-final className="mt-1 break-all text-[length:var(--nx-type-plotValue-size)] text-[var(--nx-ink)] tabular-nums">{final?.value === null || !final ? '—' : valueFormatter(final.value)}</div></div>
        <div className="min-w-0"><div>Prediction intervals</div><div className="mt-1 flex flex-wrap gap-3 text-[var(--nx-seriesA)]">{orderedBands.length ? orderedBands.map(band => <span key={band.id} data-nx-forecast-coverage>{percent.format(band.coverage)}</span>) : <span>None supplied</span>}</div></div>
      </div>
      {unavailable > 0 && <p data-nx-forecast-unavailable className="mt-3 mb-0 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{unavailable} unavailable prediction interval{unavailable === 1 ? '' : 's'}</p>}
    </div>
  </NocturneChartFrame>;
}
