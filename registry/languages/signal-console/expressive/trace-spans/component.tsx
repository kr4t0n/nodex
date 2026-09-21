'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface TraceSpanDatum {
  id: string; label: string;
  /** Nonnegative offsets from the same trace origin. End must not precede start. */
  startMs: number | null; endMs: number | null;
  /** Omit when the outcome is unknown. A duration alone does not imply success. */
  outcome?: 'ok' | 'error';
}
export interface TraceSpansProps extends SignalChartProps { data: readonly TraceSpanDatum[] }
interface Span extends TraceSpanDatum { index: number; range: [number, number] | null; duration: number | null; fill: string }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function SpanBar(props: BarShapeProps) {
  const span = props.payload as Span;
  if (!span.duration) return <g />;
  return <g data-nx-span={span.id} data-nx-start-ms={span.startMs} data-nx-end-ms={span.endMs} data-nx-duration={span.duration}>
    <Rectangle x={props.x} y={props.y} width={props.width} height={props.height} fill={span.fill} stroke="none" />
    <text x={props.x + props.width + 6} y={props.y + props.height / 2} dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)">{number.format(span.duration)}ms</text>
    {span.outcome === 'error' && props.width > 12 && <text x={props.x + 6} y={props.y + props.height / 2} dominantBaseline="central" fill="var(--nx-bg)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-font-weight-bold)">!</text>}
  </g>;
}

function EmptySpans({ spans }: { spans: Span[] }) {
  const x = useXAxisScale(); const y = useYAxisScale();
  if (!x || !y) return null;
  return <g>{spans.filter(span => !span.duration).map(span => {
    const cx = x(span.range?.[0] ?? 0) ?? 0; const cy = y(span.index) ?? 0;
    return <g key={span.id} data-nx-span-state={span.id}>
      {span.duration === 0 && <line x1={cx} x2={cx} y1={cy - 6} y2={cy + 6} stroke={span.fill} strokeWidth="var(--nx-stroke-mark)" />}
      <text x={cx + 6} y={cy} dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)">{span.duration === null ? 'Unavailable' : '0ms'}</text>
    </g>;
  })}</g>;
}

/** Native ranged bars preserve parallel spans; durations are never cumulatively stacked. */
export function TraceSpans({ data, label = 'TRACE SPANS', animate = true, 'aria-label': accessibleLabel = 'Trace spans from a common origin', ...frame }: TraceSpansProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const spans = useMemo(() => data.map((point, index): Span => {
    const valid = point.startMs !== null && point.endMs !== null && Number.isFinite(point.startMs) && Number.isFinite(point.endMs) && point.startMs >= 0 && point.endMs >= point.startMs;
    return { ...point, index, range: valid ? [point.startMs!, point.endMs!] : null, duration: valid ? point.endMs! - point.startMs! : null,
      fill: point.outcome === 'error' ? 'var(--nx-crit)' : point.outcome === 'ok' ? 'var(--nx-withinObjective)' : 'var(--nx-muted)' };
  }), [data]);
  const validIds = data.every(point => point.id.trim()) && new Set(data.map(point => point.id)).size === data.length;
  const complete = spans.length > 0 && spans.every(span => span.range !== null);
  const end = spans.reduce((maximum, span) => Math.max(maximum, span.range?.[1] ?? 0), 0);
  const status = !validIds ? 'Each span needs a unique, nonempty ID.' : !spans.some(span => span.range !== null) ? 'No complete trace spans available.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="trace-spans" label={label} animated={motion.isAnimationActive} status={status}
    summary={<>{status || !complete ? '—' : number.format(end)} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">MS / LAST END</span></>}>
    <SignalPlot minWidth={480} height={Math.max(220, spans.length * 30 + 32)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 240 }}>
        <BarChart data={spans} layout="vertical" accessibilityLayer title={accessibleLabel} desc="Each floating bar shows its actual start and end offset from a common trace origin. Concurrent spans overlap in time. A vertical tick is a zero-duration span. Use the left arrow for the next span and right for the previous span."
          margin={{ top: 4, right: 60, bottom: 0, left: 0 }} barCategoryGap="40%" className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis type="number" domain={[0, end || 1]} tickCount={5} tickFormatter={(value: number) => `${number.format(value)}MS`} height={28} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis dataKey="index" type="category" tickFormatter={(index: number) => spans[index]?.label ?? ''} width={130} interval={0} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip filterNull={false} isAnimationActive={false} cursor={false} content={({ active, label: index }) => {
            const span = typeof index === 'number' ? spans[index] : undefined;
            return active && span ? <SignalTooltip surface="var(--nx-surface)" title={span.label}>{span.range === null ? 'Unavailable' : <><div>{number.format(span.range[0])} → {number.format(span.range[1])} ms</div><div>Duration: {number.format(span.duration!)} ms</div><div>Outcome: {span.outcome === 'ok' ? 'OK' : span.outcome === 'error' ? 'Error' : 'Unknown'}</div></>}</SignalTooltip> : null;
          }} />
          <Bar id={`${id}-spans`} dataKey="range" name="Span" fill="var(--nx-muted)" shape={SpanBar} activeBar={false} animationMatchBy={matchByDataKey('id')} {...motion} />
          <EmptySpans spans={spans} />
        </BarChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey><span className="text-[var(--nx-ok)]">OK</span><span className="text-[var(--nx-crit)]">! ERROR</span><span>GRAY: OUTCOME UNKNOWN</span><span>{spans.filter(span => span.range === null).length} UNAVAILABLE</span></SignalKey>
  </SignalChartFrame>;
}
