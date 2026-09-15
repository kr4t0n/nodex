'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type AnimationInterpolateFn, type BarRectangleItem, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface StaggerDelayDatum { market: string; value: number | null; axisLabel?: string }
export interface StaggerDelayProps {
  data: readonly StaggerDelayDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface MarketRow extends StaggerDelayDatum { index: number; tone: string }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
function MarketBar({ x, y, width, height, payload }: BarShapeProps) {
  const row = payload as MarketRow;
  return row.value !== null && row.value > 0 ? <Rectangle data-nx-market={row.index} x={x} y={y} width={width} height={height} radius={[4, 4, 0, 0]} fill={row.tone} stroke="none" /> : <g />;
}
const mix = (a: number, b: number, time: number) => a + (b - a) * time;
function staggeredBars(count: number): AnimationInterpolateFn<BarRectangleItem, 'horizontal' | 'vertical'> {
  const span = 0.64 + Math.max(0, count - 1) * 0.036;
  return (items, time) => (items ?? []).flatMap(item => {
    if (item.status === 'removed') return [];
    const next = item.next;
    const progress = Math.max(0, Math.min(1, (time * span - next.originalDataIndex * 0.036) / 0.64));
    // The retained renderer remounted on changed data, so each run grew from zero.
    return [{ ...next, y: mix(next.stackedBarStart, next.y, progress), height: next.height * progress }];
  });
}

/** One native Bar series staggers its library-generated rectangles through the public animation hook. */
export function StaggerDelay({ data, height, width, animate = true, className = '', 'aria-label': label = 'Values by market' }: StaggerDelayProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => {
    const values = data.map(row => row.value !== null && Number.isFinite(row.value) && row.value >= 0 ? row.value : null); const highest = Math.max(0, ...values.map(value => value ?? 0));
    return data.map((row, index): MarketRow => ({ market: row.market, axisLabel: row.axisLabel, value: values[index] ?? null, index,
      tone: tones[highest > 0 ? Math.min(5, Math.floor((highest - (values[index] ?? 0)) / highest * 6)) : 5]! }));
  }, [data]);
  const interpolate = useMemo(() => staggeredBars(rows.length), [rows.length]);
  const available = rows.some(row => row.value !== null); const highest = Math.max(0, ...rows.map(row => row.value ?? 0));
  return <div ref={ref} className={`nx-stagger-delay flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="stagger-delay" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No market readings available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <BarChart data={rows} accessibilityLayer title={label} desc="Bar height shows the supplied value; darker tone means a larger fraction of this dataset's maximum. Use the left and right arrow keys to inspect markets."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 14, bottom: 0, left: 0, right: 10 }} barCategoryGap="13%">
          <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-mark)" />
          <XAxis dataKey="index" type="category" scale="band" height={24} ticks={rows.filter(row => row.axisLabel).map(row => row.index)} interval={0} axisLine={false} tickLine={false} tickSize={0} tickMargin={8}
            tick={({ x, y, payload }) => <text x={x} y={y} dy="0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 9 / 8)" fontWeight="var(--nx-type-subtitle-weight)">{rows[payload.value]?.axisLabel}</text>} />
          <YAxis type="number" width={36} domain={[0, highest > 0 ? 'auto' : 1]} tickCount={7} niceTicks="snap125" axisLine={false} tickLine={false} tickSize={0} tickMargin={8}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 9.5 / 8)', fontFamily: 'var(--nx-font-sans)' }} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const row = typeof index === 'number' ? rows[index] : undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.market} — {row.value ?? 'Unavailable'}</div> : null;
          }} />
          <Bar id={`${id}-markets`} dataKey="value" name="Market value" shape={MarketBar} activeBar={false} fill="var(--nx-ink)" stroke="none" {...motion}
            animationDuration={motion.animationDuration * (0.64 + Math.max(0, rows.length - 1) * 0.036)} animationInterpolateFn={interpolate} />
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
