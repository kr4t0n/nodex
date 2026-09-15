'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps, type LabelProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ChunkyBarsDatum {
  plan: string;
  /** Monthly recurring revenue in thousands of dollars. Null is unavailable. */
  mrrK: number | null;
}

export interface ChunkyBarsProps {
  data: readonly ChunkyBarsDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface PlanPoint extends ChunkyBarsDatum {
  index: number;
  fill: string;
}

/** The library owns the bar coordinates; zero retains its label without a mark. */
function CappedBar({ x, y, width, height, payload }: BarShapeProps) {
  const point = payload as PlanPoint;
  return <g data-nx-observation={point.index}>
    {height > 0 && <Rectangle x={x} y={y} width={width} height={height} radius={[99, 99, 0, 0]}
      fill={point.fill} stroke="none" className="nx-chunky-bar" data-nx-bar={point.index} />}
  </g>;
}

function PlanValue({ viewBox, value, observations }: LabelProps & { observations: readonly PlanPoint[] }) {
  const point = typeof value === 'number' ? observations[value] : undefined;
  if (!point || !viewBox || !('x' in viewBox) || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number' || typeof viewBox.width !== 'number') return <g />;
  return <text x={viewBox.x + viewBox.width / 2} y={viewBox.y - 10} dy="-0.5em" textAnchor="middle" dominantBaseline="central"
    fill="var(--nx-ink)" fontFamily="var(--nx-font-sans)" fontSize="calc(var(--nx-type-plotValue-size) * 13 / 17)" fontWeight="var(--nx-type-plotValue-weight)"
    data-nx-total={point.index}>{point.mrrK === null ? '—' : `$${point.mrrK}K`}</text>;
}

/** Caller order remains fixed while tone ranks the plans by their current revenue. */
export function ChunkyBars({ data, height, width, animate = true, className = '', 'aria-label': label = 'Revenue by plan' }: ChunkyBarsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, maximum } = useMemo(() => {
    const observations = data.map((point, index) => ({
      plan: point.plan,
      mrrK: point.mrrK !== null && Number.isFinite(point.mrrK) && point.mrrK >= 0 ? point.mrrK : null,
      index,
    }));
    // Index identity keeps repeated plan labels and ties deterministic.
    const ranked = observations.filter((point) => point.mrrK !== null)
      .sort((a, b) => (b.mrrK ?? 0) - (a.mrrK ?? 0) || a.index - b.index);
    const ranks = new Map(ranked.map((point, rank) => [point.index, rank]));
    const tones = ['var(--nx-ink)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
    return {
      points: observations.map((point): PlanPoint => ({
        ...point,
        fill: tones[Math.min(ranks.get(point.index) ?? 3, 3)] ?? 'var(--nx-faint)',
      })),
      maximum: ranked[0]?.mrrK ?? 0,
    };
  }, [data]);
  const available = points.some((point) => point.mrrK !== null);
  const headroom = Math.round(maximum * 1.12);
  // Tiny positive values and an all-zero dataset still need a usable zero-based scale.
  const ceiling = Math.max(maximum, Number.isFinite(headroom) ? headroom : maximum) || 1;

  return <div ref={ref} className={`nx-chunky-bars flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="chunky-bars" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : (
      <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
          <BarChart data={points} accessibilityLayer title={label}
            desc="Bar height compares monthly recurring revenue in thousands of dollars. Darker tones rank larger values; plan order follows the supplied data. Use the left and right arrow keys to inspect plans."
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
            margin={{ top: 48, right: 10, bottom: 0, left: 10 }} barCategoryGap="24%" barGap={0}>
            <XAxis dataKey="index" type="category" scale="band" height={28} interval={0} tickSize={0} tickMargin={10}
              axisLine={false} tickLine={false} tick={({ x, y, payload }) => <text x={x} y={y} dy="0.5em" textAnchor="middle" dominantBaseline="central"
                fill="var(--nx-muted)" fontFamily="var(--nx-font-sans)" fontSize="calc(var(--nx-type-axis-size) * 9 / 8)" fontWeight="var(--nx-type-axis-weight)">
                {typeof payload.value === 'number' ? points[payload.value]?.plan : ''}
              </text>} />
            <YAxis type="number" hide domain={[0, ceiling]} />
            <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
              const point = typeof index === 'number' ? points[index] : undefined;
              return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
                {point.mrrK === null ? 'Unavailable' : `$${point.mrrK}K MRR`}
              </div> : null;
            }} />
            <Bar id={`${id}-plans`} dataKey="mrrK" name="MRR" fill="var(--nx-ink)" stroke="none" shape={CappedBar} activeBar={false} {...motion}>
              <LabelList dataKey="index" content={<PlanValue observations={points} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>;
}
