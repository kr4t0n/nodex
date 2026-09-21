'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface RequestThroughputDatum { id: string; label: string; requestsPerSecond: number | null }
export interface RequestThroughputProps extends SignalChartProps { data: readonly RequestThroughputDatum[] }
interface Point extends RequestThroughputDatum { index: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function Reading(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Point };
  if (cx === undefined || cy === undefined || !payload || payload.requestsPerSecond === null) return <g />;
  return <circle data-nx-throughput={payload.id} data-nx-value={payload.requestsPerSecond} cx={cx} cy={cy} r={2} fill="var(--nx-ink)" stroke="none" />;
}

/** Equally spaced aggregation windows. A gap is unavailable throughput, never zero. */
export function RequestThroughput({ data, label = 'REQUEST THROUGHPUT', animate = true, 'aria-label': accessibleLabel = 'Requests per second by window', ...frame }: RequestThroughputProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => data.map((point, index): Point => ({ ...point, index,
    requestsPerSecond: point.requestsPerSecond !== null && Number.isFinite(point.requestsPerSecond) && point.requestsPerSecond >= 0 ? point.requestsPerSecond : null,
  })), [data]);
  const validIds = data.every(point => point.id.trim()) && new Set(data.map(point => point.id)).size === data.length;
  const known = points.filter(point => point.requestsPerSecond !== null);
  const latest = points.at(-1)?.requestsPerSecond;
  const peak = known.reduce((value, point) => Math.max(value, point.requestsPerSecond!), 0);
  const status = !validIds ? 'Each window needs a unique, nonempty ID.' : !known.length ? 'No throughput observations available.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="request-throughput" label={label} animated={motion.isAnimationActive} status={status}
    summary={<>{status || latest === null || latest === undefined ? '—' : number.format(latest)} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">REQ/S</span></>}>
    <SignalPlot>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 220 }}>
        <AreaChart data={points} accessibilityLayer title={accessibleLabel} desc="Height shows requests per second from zero. Windows retain caller order and equal spacing. Missing readings break the area. Use left and right arrows to inspect windows."
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis dataKey="index" tickFormatter={(index: number) => points[index]?.label ?? ''} padding={{ left: 4, right: 4 }} minTickGap={32} height={28} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis domain={[0, peak || 1]} width={44} tickCount={4} tickFormatter={(value: number) => compact.format(value)} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)' }} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <SignalTooltip surface="var(--nx-surface)" title={point.label}>{point.requestsPerSecond === null ? 'Unavailable' : `${number.format(point.requestsPerSecond)} req/s`}</SignalTooltip> : null;
          }} />
          <Area id={`${id}-requests`} dataKey="requestsPerSecond" type="linear" baseValue={0} connectNulls={false} fill="var(--nx-muted)" fillOpacity={0.16}
            stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-mark)' }} dot={Reading} activeDot={false} animationMatchBy={matchByDataKey('id')} {...motion} />
        </AreaChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey><span>PEAK {number.format(peak)} REQ/S</span><span>{points.length - known.length} UNAVAILABLE WINDOWS</span></SignalKey>
  </SignalChartFrame>;
}
