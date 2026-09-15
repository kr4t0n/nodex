'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Rectangle, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export type TickBoxSummary = readonly [min: number, q1: number, median: number, q3: number, max: number];
export interface TickBoxDatum { plan: string; summary: TickBoxSummary | null; outliers: readonly (number | null)[] }
export interface TickBoxProps {
  data: readonly TickBoxDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface BoxPoint { index: string; column: number; hours: number; plan: string; kind: 'box'; summary: TickBoxSummary; rank: number }
interface OutlierPoint { index: string; column: number; hours: number; plan: string; kind: 'outlier' }
type Observation = BoxPoint | OutlierPoint;
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-muted)'];

function BoxMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Observation };
  const yScale = useYAxisScale();
  if (cx === undefined || cy === undefined || !payload || !yScale) return <g />;
  if (payload.kind === 'outlier') return <g data-nx-observation={payload.index}><circle data-nx-outlier={payload.index} cx={cx} cy={cy} r={2.7} fill="var(--nx-muted)" opacity={0.8} /></g>;
  const [minimum, q1, median, q3, maximum] = payload.summary.map((value) => yScale(value) ?? cy);
  if (minimum === undefined || q1 === undefined || median === undefined || q3 === undefined || maximum === undefined) return <g />;
  return <g data-nx-observation={payload.index}>
    <Rectangle data-nx-box={payload.index} x={cx - 12} y={q3} width={24} height={Math.max(0, q1 - q3)} fill={tones[payload.rank] ?? 'var(--nx-markQuiet)'} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-mark)" />
    <g fill="none" stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-mark)">
      <line data-nx-whisker="low" x1={cx} x2={cx} y1={minimum} y2={q1} />
      <line data-nx-whisker="high" x1={cx} x2={cx} y1={maximum} y2={q3} />
      {[minimum, maximum, median].map((y, index) => <line key={index} x1={cx - 12} x2={cx + 12} y1={y} y2={y} />)}
    </g>
    <text data-nx-median={payload.index} x={cx + 16} y={median} dominantBaseline="central" fill="var(--nx-ink)" opacity={0.8}
      fontSize="calc(var(--nx-type-plotValue-size) * 9.5 / 17)" fontWeight="var(--nx-type-pageTitle-weight)" pointerEvents="none">{payload.hours.toFixed(1)}h</text>
  </g>;
}

/** A summary and each outlier remain separately inspectable within the library's series. */
export function TickBox({ data, height, width, animate = true, className = '', 'aria-label': label = 'Reply-time summaries and outliers by plan' }: TickBoxProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    const summaries = data.flatMap((plan, column) => plan.summary?.length === 5 && plan.summary.every((value, index, values) => Number.isFinite(value) && value >= 0 && (index === 0 || value >= (values[index - 1] ?? 0)))
      ? [{ column, plan: plan.plan, summary: plan.summary }] : []);
    const ranks = [...summaries].sort((a, b) => a.summary[2] - b.summary[2] || a.column - b.column).map((plan) => plan.column);
    const boxes: BoxPoint[] = summaries.map((plan) => ({ ...plan, index: `${plan.column}:box`, kind: 'box', hours: plan.summary[2], rank: ranks.indexOf(plan.column) }));
    const outliers: OutlierPoint[] = data.flatMap((plan, column) => plan.outliers.flatMap((hours, index) => hours !== null && Number.isFinite(hours) && hours >= 0
      ? [{ index: `${column}:outlier:${index}`, column, hours, plan: plan.plan, kind: 'outlier' as const }] : []));
    return [...boxes, ...outliers];
  }, [data]);
  const ceiling = Math.max(24, ...points.map((point) => point.kind === 'box' ? point.summary[4] : point.hours));
  const step = Math.max(6, Math.ceil(ceiling / 24) * 6);
  const ticks = [...Array.from({ length: Math.floor(ceiling / step) + 1 }, (_, index) => index * step), ...(ceiling % step ? [ceiling] : [])];
  return <div ref={ref} className={`nx-tick-box flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="tick-box" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Boxes show the middle half of reply times, whiskers their ordinary range, and dots individual outliers. The median is marked and labelled. Use the left and right arrow keys to inspect summaries and outliers."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 26, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--nx-plotGrid)" strokeWidth="calc(var(--nx-stroke-hairline) * 8 / 7)" />
          <XAxis dataKey="column" type="number" domain={[-0.5, data.length - 0.5]} height={44} ticks={data.map((_, index) => index)} interval={0}
            tickFormatter={(column: number) => data[column]?.plan ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <YAxis dataKey="hours" type="number" domain={[0, ceiling]} width={44} ticks={ticks} interval={0}
            tickFormatter={(hours: number) => `${hours}h`} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Observation | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.plan} — {point.kind === 'box' ? `half of tickets answered in ${point.summary[1]}–${point.summary[3]}h` : `${point.hours}h outlier`}</div> : null;
          }} />
          <Scatter id={`${id}-summaries`} data={points} name="Reply times" fill="var(--nx-ink)" shape={<BoxMark />} activeShape={<BoxMark />} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-muted)]">BOX = THE MIDDLE HALF · WHISKERS = ORDINARY RANGE · DOTS = OUTLIERS</div>
    </div>}
  </div>;
}
