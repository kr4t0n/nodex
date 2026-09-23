'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface LatencyTrendDatum { id: string; label: string; p50Ms: number | null; p95Ms: number | null; p99Ms: number | null }
export interface LatencyTrendProps extends SignalChartProps { data: readonly LatencyTrendDatum[]; objectiveMs: number }
interface Point extends LatencyTrendDatum { index: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const series = [
  { key: 'p50Ms', label: 'P50', stroke: 'var(--nx-faint)', dash: '2 4' },
  { key: 'p95Ms', label: 'P95', stroke: 'var(--nx-muted)', dash: '6 4' },
  { key: 'p99Ms', label: 'P99', stroke: 'var(--nx-ink)', dash: undefined },
] as const;

function Reading({ props, seriesKey, stroke, objective }: { props: unknown; seriesKey: typeof series[number]['key']; stroke: string; objective: number | null }) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Point };
  if (cx === undefined || cy === undefined || !payload || payload[seriesKey] === null) return <g />;
  const breached = seriesKey === 'p99Ms' && objective !== null && payload[seriesKey]! > objective;
  return <circle data-nx-latency={payload.id} data-nx-percentile={seriesKey} data-nx-value={payload[seriesKey]} cx={cx} cy={cy} r={breached ? 3 : 2}
    fill={breached ? 'var(--nx-crit)' : stroke} stroke="none" />;
}

export function LatencyTrend({ data, objectiveMs, label = 'LATENCY PERCENTILES', animate = true, 'aria-label': accessibleLabel = 'Latency percentiles by window', ...frame }: LatencyTrendProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => data.map((point, index): Point => {
    const valid = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0 ? value : null;
    const p50Ms = valid(point.p50Ms); const p95Ms = valid(point.p95Ms); const p99Ms = valid(point.p99Ms);
    // Inconsistent quantiles cannot describe a distribution, even when each is finite.
    const ordered = (p50Ms === null || p95Ms === null || p50Ms <= p95Ms) && (p95Ms === null || p99Ms === null || p95Ms <= p99Ms) && (p50Ms === null || p99Ms === null || p50Ms <= p99Ms);
    return { ...point, index, p50Ms: ordered ? p50Ms : null, p95Ms: ordered ? p95Ms : null, p99Ms: ordered ? p99Ms : null };
  }), [data]);
  const objective = Number.isFinite(objectiveMs) && objectiveMs >= 0 ? objectiveMs : null;
  const validIds = data.every(point => point.id.trim()) && new Set(data.map(point => point.id)).size === data.length;
  const latest = points.at(-1)?.p99Ms;
  const status = !validIds ? 'Each window needs a unique, nonempty ID.' : !points.some(point => series.some(item => point[item.key] !== null)) ? 'No latency observations available.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="latency-trend" label={label} animated={motion.isAnimationActive} status={status}
    summary={<span className={latest !== null && latest !== undefined && objective !== null && latest > objective ? 'text-[var(--nx-crit)]' : undefined}>{status || latest === null || latest === undefined ? '—' : number.format(latest)} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">MS P99</span></span>}>
    <SignalPlot>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 220 }}>
        <LineChart data={points} accessibilityLayer title={accessibleLabel} desc="Solid P99, dashed P95 and dotted P50 show equally spaced windows. Red P99 dots exceed the stated objective. Missing readings break each line. Use left and right arrows to inspect."
          margin={{ top: 18, right: 12, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis dataKey="index" tickFormatter={(index: number) => points[index]?.label ?? ''} minTickGap={32} height={28} padding={{ left: 4, right: 4 }} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis domain={[0, 'auto']} width={44} tickCount={4} tickLine={false} axisLine={false} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          {objective !== null && <ReferenceLine y={objective} ifOverflow="extendDomain" stroke="var(--nx-warn)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4"
            label={{ value: `SLO ${number.format(objective)}MS`, position: 'insideTopLeft', fill: 'var(--nx-warn)', fontSize: 'var(--nx-type-axis-size)' }} />}
          <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)' }} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <SignalTooltip surface="var(--nx-surface)" title={point.label}>{series.map(item => <div key={item.key}>{item.label}: {point[item.key] === null ? 'Unavailable' : `${number.format(point[item.key]!)} ms`}</div>)}</SignalTooltip> : null;
          }} />
          {series.map(item => <Line key={item.key} id={`${id}-${item.key}`} dataKey={item.key} name={item.label} type="linear" connectNulls={false}
            stroke={item.stroke} strokeDasharray={item.dash} strokeWidth="var(--nx-stroke-mark)" dot={props => <Reading props={props} seriesKey={item.key} stroke={item.stroke} objective={objective} />} activeDot={false} animationMatchBy={matchByDataKey('id')} {...motion} />)}
        </LineChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey><span>·· P50</span><span>– – P95</span><span>— P99</span><span className="text-[var(--nx-crit)]">● OVER SLO</span>{objective === null && <span>SLO UNAVAILABLE</span>}</SignalKey>
  </SignalChartFrame>;
}
