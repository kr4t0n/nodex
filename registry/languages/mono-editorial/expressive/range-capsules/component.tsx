'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface RangeCapsulesDatum {
  day: string;
  lowK: number | null;
  highK: number | null;
}
export interface RangeCapsulesProps {
  data: readonly RangeCapsulesDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DayPoint extends RangeCapsulesDatum { index: number; range: [number, number] | null }

function Capsule({ x, y, width, height, payload }: BarShapeProps) {
  const point = payload as DayPoint;
  return <g data-nx-observation={point.index}>{point.range && height > 0 && <Rectangle data-nx-capsule={point.index}
    x={x} y={y} width={width} height={height} radius={99} fill="var(--nx-ink)" stroke="none" />}</g>;
}

/** A real interval series; neither endpoint is an invisible synthetic baseline. */
export function RangeCapsules({ data, height, width, animate = true, className = '', 'aria-label': label = 'Daily active user ranges' }: RangeCapsulesProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.map((point, index): DayPoint => {
    const valid = point.lowK !== null && point.highK !== null && Number.isFinite(point.lowK) && Number.isFinite(point.highK) && point.lowK >= 0 && point.highK >= point.lowK;
    return { day: point.day, lowK: valid ? point.lowK : null, highK: valid ? point.highK : null, index, range: valid ? [point.lowK!, point.highK!] : null };
  }), [data]);
  const minimum = Math.min(50, ...points.flatMap((point) => point.range ? [point.range[0]] : []));
  const maximum = Math.max(320, ...points.flatMap((point) => point.range ? [point.range[1]] : []));
  const labelled = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
  return <div ref={ref} className={`nx-range-capsules flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="range-capsules" data-nx-animated={motion.isAnimationActive}>
    {!points.some((point) => point.range !== null) ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <BarChart data={points} accessibilityLayer title={label} desc="Each capsule spans the day's minimum and maximum active users in thousands. Use the left and right arrow keys to inspect days."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 16, right: 14, bottom: 0, left: 0 }} barCategoryGap="34%" barGap={0}>
          <XAxis dataKey="index" type="category" height={30} interval={0} axisLine={false} tickLine={false} tickSize={0} tickMargin={10}
            tickFormatter={(index: number) => labelled.has(index) ? points[index]?.day ?? '' : ''}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 9 / 8)' }} />
          <YAxis type="number" width={46} domain={[minimum, maximum]} ticks={minimum === 50 && maximum === 320 ? [50, 100, 150, 200, 250, 300, 320] : undefined} interval={0}
            axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(value: number) => `${value}K`}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 9.5 / 8)' }} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.range ? `${point.range[0]}K – ${point.range[1]}K users` : 'Unavailable'}
            </div> : null;
          }} />
          <Bar id={`${id}-range`} dataKey="range" name="Active users" fill="var(--nx-ink)" stroke="none" shape={Capsule} activeBar={false} {...motion} />
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
