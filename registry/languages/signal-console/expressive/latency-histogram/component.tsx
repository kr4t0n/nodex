'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface LatencyHistogramDatum { count: number | null }
export interface LatencyHistogramProps extends SignalChartProps {
  data: readonly LatencyHistogramDatum[];
  /** Equal, half-open buckets [start, end); the final bucket includes its upper boundary. */
  bucketWidthMs: number;
  startMs?: number;
  objectiveMs?: number;
}
interface Bin { index: number; from: number; to: number; center: number; count: number | null }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function Bucket(props: BarShapeProps) {
  const xScale = useXAxisScale(); const bin = props.payload as Bin;
  if (!xScale || !bin.count) return <g />;
  const x = xScale(bin.from); const right = xScale(bin.to);
  if (x === undefined || right === undefined) return <g />;
  return <Rectangle x={x} y={props.y} width={Math.max(0, right - x)} height={props.height} fill="var(--nx-muted)" stroke="var(--nx-surface)" strokeWidth="var(--nx-stroke-hairline)"
    data-nx-bucket={bin.index} data-nx-from={bin.from} data-nx-to={bin.to} data-nx-count={bin.count} />;
}

function EmptyBuckets({ bins }: { bins: Bin[] }) {
  const x = useXAxisScale(); const y = useYAxisScale();
  if (!x || !y) return null;
  return <g>{bins.filter(bin => !bin.count).map(bin => <text key={bin.index} data-nx-bucket-state={bin.index} x={x(bin.center)} y={(y(0) ?? 0) - 5} textAnchor="middle"
    fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)">{bin.count === null ? '?' : '0'}</text>)}</g>;
}

/** Pre-aggregated equal-width buckets. Neither percentiles nor SLO counts are guessed from bins. */
export function LatencyHistogram({ data, bucketWidthMs, startMs = 0, objectiveMs, label = 'LATENCY DISTRIBUTION', animate = true, 'aria-label': accessibleLabel = 'Request counts by latency bucket', ...frame }: LatencyHistogramProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const bins = useMemo(() => data.map((point, index): Bin => ({ index, from: startMs + index * bucketWidthMs, to: startMs + (index + 1) * bucketWidthMs,
    center: startMs + (index + 0.5) * bucketWidthMs, count: point.count !== null && Number.isSafeInteger(point.count) && point.count >= 0 ? point.count : null,
  })), [data, startMs, bucketWidthMs]);
  const end = startMs + data.length * bucketWidthMs;
  const scaleValid = Number.isFinite(startMs) && startMs >= 0 && Number.isFinite(bucketWidthMs) && bucketWidthMs > 0 && Number.isFinite(end) && (!bins.length || end > startMs);
  const sum = bins.reduce((total, bin) => total + (bin.count ?? 0), 0);
  const total = bins.length && bins.every(bin => bin.count !== null) && Number.isSafeInteger(sum) ? sum : null;
  const objective = objectiveMs !== undefined && Number.isFinite(objectiveMs) && objectiveMs >= 0 ? objectiveMs : null;
  const status = !scaleValid ? 'Use a nonnegative start and a finite, positive bucket width.' : !bins.some(bin => bin.count !== null) ? 'No latency bucket observations available.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="latency-histogram" label={label} animated={motion.isAnimationActive} status={status}
    summary={<>{status || total === null ? '—' : number.format(total)} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">REQUESTS</span></>}>
    <SignalPlot minWidth={Math.max(360, bins.length * 24 + 60)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 220 }}>
        <BarChart data={bins} accessibilityLayer title={accessibleLabel} desc="Bar height is the request count in each equal-width latency bucket. A question mark means unavailable, while 0 means no requests. Use left and right arrows to inspect buckets."
          margin={{ top: 24, right: 16, bottom: 0, left: 0 }} barCategoryGap={0} barGap={0} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis dataKey="center" type="number" domain={[startMs, end]} allowDataOverflow tickCount={6} height={28} tickLine={false} axisLine={false}
            tickFormatter={(value: number) => `${number.format(value)}MS`} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis domain={[0, 'auto']} allowDecimals={false} tickCount={4} width={44} tickLine={false} axisLine={false} tickFormatter={(value: number) => compact.format(value)}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          {objective !== null && objective >= startMs && objective <= end && <ReferenceLine x={objective} stroke="var(--nx-warn)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4"
            label={{ value: `SLO ${number.format(objective)}MS`, position: 'top', fill: 'var(--nx-warn)', fontSize: 'var(--nx-type-axis-size)' }} />}
          <Tooltip filterNull={false} isAnimationActive={false} cursor={false} content={({ active, label: center }) => {
            const bin = bins.find(item => item.center === center);
            return active && bin ? <SignalTooltip surface="var(--nx-surface)" title={`${number.format(bin.from)} ≤ latency ${bin.index === bins.length - 1 ? '≤' : '<'} ${number.format(bin.to)} ms`}>
              {bin.count === null ? 'Unavailable' : `${number.format(bin.count)} requests`}
            </SignalTooltip> : null;
          }} />
          <Bar id={`${id}-buckets`} dataKey="count" name="Requests" fill="var(--nx-muted)" shape={Bucket} activeBar={false} {...motion} />
          <EmptyBuckets bins={bins} />
        </BarChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey><span>{number.format(bucketWidthMs)}MS BUCKETS</span><span>{bins.filter(bin => bin.count === null).length} UNAVAILABLE</span>{objective !== null && <span className="text-[var(--nx-warn)]">SLO {number.format(objective)}MS</span>}</SignalKey>
  </SignalChartFrame>;
}
