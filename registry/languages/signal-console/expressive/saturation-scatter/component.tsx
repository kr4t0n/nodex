'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface SaturationScatterDatum { id: string; label: string; cpuPercent: number | null; latencyMs: number | null }
export interface SaturationScatterProps extends SignalChartProps { data: readonly SaturationScatterDatum[]; cpuThresholdPercent: number; latencyObjectiveMs: number }
interface Point extends SaturationScatterDatum { cpuPercent: number; latencyMs: number; state: 'within' | 'cpu' | 'latency' }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const states = {
  within: { fill: 'var(--nx-withinObjective)', label: 'WITHIN LIMITS' },
  cpu: { fill: 'var(--nx-warn)', label: 'CPU ABOVE LIMIT' },
  latency: { fill: 'var(--nx-crit)', label: 'LATENCY OVER SLO' },
};

function Host(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Point };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <g data-nx-host={payload.id} data-nx-state={payload.state} data-nx-cpu={payload.cpuPercent} data-nx-latency-ms={payload.latencyMs} fill={states[payload.state].fill} stroke="none">
    {payload.state === 'latency' ? <rect x={cx - 4} y={cy - 4} width={8} height={8} /> : payload.state === 'cpu' ? <polygon points={`${cx},${cy - 5} ${cx + 5},${cy + 4} ${cx - 5},${cy + 4}`} /> : <circle cx={cx} cy={cy} r={3.5} />}
  </g>;
}

/** One host per observation; color and shape report the two explicitly supplied limits. */
export function SaturationScatter({ data, cpuThresholdPercent, latencyObjectiveMs, label = 'SATURATION / LATENCY', animate = true, 'aria-label': accessibleLabel = 'Host CPU utilization and latency', ...frame }: SaturationScatterProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => data.flatMap((point): Point[] => point.cpuPercent !== null && Number.isFinite(point.cpuPercent) && point.cpuPercent >= 0 && point.cpuPercent <= 100 &&
    point.latencyMs !== null && Number.isFinite(point.latencyMs) && point.latencyMs >= 0 ? [{ ...point, cpuPercent: point.cpuPercent, latencyMs: point.latencyMs,
      state: point.latencyMs > latencyObjectiveMs ? 'latency' : point.cpuPercent > cpuThresholdPercent ? 'cpu' : 'within' }] : []), [data, cpuThresholdPercent, latencyObjectiveMs]);
  const validIds = data.every(point => point.id.trim()) && new Set(data.map(point => point.id)).size === data.length;
  const validLimits = Number.isFinite(cpuThresholdPercent) && cpuThresholdPercent >= 0 && cpuThresholdPercent <= 100 && Number.isFinite(latencyObjectiveMs) && latencyObjectiveMs >= 0;
  const status = !validIds ? 'Each host needs a unique, nonempty ID.' : !validLimits ? 'Use a CPU limit from 0 to 100 and a nonnegative latency objective.' : !points.length ? 'No complete host observations available.' : null;
  const over = points.filter(point => point.state !== 'within').length;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="saturation-scatter" label={label} animated={motion.isAnimationActive} status={status}
    summary={<>{status ? '—' : over} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">OVER LIMIT</span></>}>
    <SignalPlot>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 220 }}>
        <ScatterChart accessibilityLayer title={accessibleLabel} desc="Horizontal position is CPU percent; vertical position is latency in milliseconds. Circles are within limits, triangles exceed the CPU limit, squares exceed the latency objective. Use left and right arrows to inspect hosts."
          margin={{ top: 16, right: 16, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis dataKey="cpuPercent" type="number" domain={[0, 100]} padding={{ left: 6, right: 6 }} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value: number) => `${value}%`} height={28} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis dataKey="latencyMs" type="number" domain={[0, 'auto']} padding={{ top: 6, bottom: 6 }} tickCount={4} width={54} tickFormatter={(value: number) => `${number.format(value)}MS`} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <ReferenceLine x={cpuThresholdPercent} stroke="var(--nx-warn)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4"
            label={{ value: `CPU ${number.format(cpuThresholdPercent)}%`, position: 'insideTopLeft', fill: 'var(--nx-warn)', fontSize: 'var(--nx-type-axis-size)' }} />
          <ReferenceLine y={latencyObjectiveMs} ifOverflow="extendDomain" stroke="var(--nx-warn)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4"
            label={{ value: `SLO ${number.format(latencyObjectiveMs)}MS`, position: 'insideTopLeft', fill: 'var(--nx-warn)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | undefined;
            return active && point ? <SignalTooltip surface="var(--nx-surface)" title={point.label}><div>CPU: {number.format(point.cpuPercent)}%</div><div>Latency: {number.format(point.latencyMs)} ms</div><div className="mt-1">{states[point.state].label}</div></SignalTooltip> : null;
          }} />
          <Scatter id={`${id}-hosts`} data={points} fill="var(--nx-withinObjective)" shape={Host} activeShape={false} animationMatchBy={matchByDataKey('id')} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey><span>○ WITHIN LIMITS</span><span className="text-[var(--nx-warn)]">△ CPU HIGH</span><span className="text-[var(--nx-crit)]">□ LATENCY HIGH</span><span>{data.length - points.length} UNAVAILABLE</span></SignalKey>
  </SignalChartFrame>;
}
