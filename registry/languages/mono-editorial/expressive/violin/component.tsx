'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ViolinDatum { plan: string; hours: readonly (number | null)[]; bandwidth: number }
export interface ViolinProps {
  data: readonly ViolinDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface PlanPoint { plan: string; index: number; median: number; values: number[]; bandwidth: number; rank: number; curve: number[]; ceiling: number }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-muted)'];
const resolution = 48;

function density(values: readonly number[], bandwidth: number, ceiling: number): number[] {
  const raw = Array.from({ length: resolution }, (_, index) => {
    const hours = index / (resolution - 1) * ceiling;
    return values.reduce((sum, value) => sum + Math.exp(-0.5 * ((hours - value) / bandwidth) ** 2), 0);
  });
  const peak = Math.max(...raw);
  return raw.map((value) => peak > 0 ? value / peak : 0);
}

function ViolinMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: PlanPoint };
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (cx === undefined || cy === undefined || !payload || !xScale || !yScale) return <g />;
  const band = Math.abs((xScale(payload.index + 0.5) ?? cx) - (xScale(payload.index - 0.5) ?? cx));
  const halfWidth = 0.32 * band;
  const right = payload.curve.map((value, index) => ({ x: cx + value * halfWidth, y: yScale(index / (resolution - 1) * payload.ceiling) ?? cy }));
  const left = payload.curve.map((value, index) => ({ x: cx - value * halfWidth, y: yScale(index / (resolution - 1) * payload.ceiling) ?? cy })).reverse();
  return <g data-nx-observation={payload.index}>
    <Curve data-nx-violin={payload.index} type="linearClosed" points={[...right, ...left]} fill={tones[payload.rank] ?? 'var(--nx-markQuiet)'} stroke="none" />
    <line data-nx-median-rule={payload.index} x1={cx - halfWidth * 0.55} x2={cx + halfWidth * 0.55} y1={cy} y2={cy} stroke="var(--nx-bg)" strokeWidth={2.2} pointerEvents="none" />
    <text data-nx-median={payload.index} x={cx + halfWidth + 6} y={cy} dominantBaseline="central" fill="var(--nx-ink)" opacity={0.8}
      fontSize="calc(var(--nx-type-plotValue-size) * 9 / 17)" fontWeight="var(--nx-type-pageTitle-weight)" pointerEvents="none">{payload.median.toFixed(1)}h</text>
  </g>;
}

/** A Gaussian density outline per plan, using actual observations and a caller bandwidth. */
export function Violin({ data, height, width, animate = true, className = '', 'aria-label': label = 'Distribution of reply times by plan' }: ViolinProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, ceiling } = useMemo(() => {
    const valid = data.flatMap((plan, index) => {
      const values = plan.hours.filter((hours): hours is number => hours !== null && Number.isFinite(hours) && hours >= 0).sort((a, b) => a - b);
      return values.length && Number.isFinite(plan.bandwidth) && plan.bandwidth > 0 ? [{ plan: plan.plan, index, median: values[Math.floor(values.length / 2)] ?? 0, values, bandwidth: plan.bandwidth }] : [];
    });
    const ceiling = Math.max(17, ...valid.flatMap((plan) => plan.values));
    const ranks = [...valid].sort((a, b) => a.median - b.median || a.index - b.index).map((plan) => plan.index);
    return { ceiling, points: valid.map((plan): PlanPoint => ({ ...plan, rank: ranks.indexOf(plan.index), ceiling, curve: density(plan.values, plan.bandwidth, ceiling) })) };
  }, [data]);
  const tickStep = Math.max(4, Math.ceil(ceiling / 17) * 4);
  const ticks = [...Array.from({ length: Math.floor(ceiling / tickStep) + 1 }, (_, index) => index * tickStep), ...(ceiling % tickStep ? [ceiling] : [])];
  return <div ref={ref} className={`nx-violin flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="violin" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each violin shows the distribution of available reply times for a plan. Width is normalized within each plan. A background rule and number show its median. Use the left and right arrow keys to inspect plans."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 30, right: 26, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--nx-plotGrid)" strokeWidth="calc(var(--nx-stroke-hairline) * 8 / 7)" />
          <XAxis dataKey="index" type="number" domain={[-0.5, data.length - 0.5]} height={46} ticks={data.map((_, index) => index)} interval={0}
            tickFormatter={(index: number) => data[index]?.plan ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <YAxis dataKey="median" type="number" domain={[0, ceiling]} width={44} ticks={ticks} interval={0}
            tickFormatter={(hours: number) => `${hours}h`} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as PlanPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.plan} — median {point.median.toFixed(1)}h</div> : null;
          }} />
          <Scatter id={`${id}-plans`} data={points} name="Reply times" fill="var(--nx-ink)" shape={<ViolinMark />} activeShape={<ViolinMark />} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">WIDTH = HOW MANY TICKETS · KNOCKED-OUT RULE = THE MEDIAN</div>
    </div>}
  </div>;
}
