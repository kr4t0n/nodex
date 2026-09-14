'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { RungMarks } from '../../../../_shared/rung-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export type RungWaterfallDatum =
  | { label: string; kind: 'start' | 'change'; valueK: number | null }
  | { label: string; kind: 'total' };
export interface RungWaterfallProps {
  data: readonly RungWaterfallDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface StepPoint {
  index: number;
  label: string;
  kind: RungWaterfallDatum['kind'];
  value: number | null;
  range: [number, number] | null;
  broken: boolean;
}

function StepRungs(props: BarShapeProps) {
  const xScale = useXAxisScale();
  const point = props.payload as StepPoint;
  const x = xScale?.(point.index, { position: 'middle' });
  if (x === undefined || !point.range) return null;
  const count = point.range[1] - point.range[0];
  return <RungMarks x={x} bottom={props.y + props.height} step={count ? props.height / count : 0} count={count}
    width={[19, 5]} widthSeed={point.index + 2} opacity={point.broken ? [0.7, 0] : [0.75, 0.25]} opacitySeed={point.index + 5}
    fill={point.broken ? 'var(--nx-muted)' : 'var(--nx-ink)'} broken={point.broken} observation={point.index} series={point.kind} />;
}

function StepLabel({ value, observations }: LabelProps & { observations: readonly StepPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = typeof value === 'number' ? observations[value] : undefined;
  const x = xScale?.(value, { position: 'middle' });
  const y = yScale?.((point?.range?.[1] ?? 0) + 2);
  return point && x !== undefined && y !== undefined ? <text data-nx-total={point.index} x={x} y={y} dy="-0.5em" textAnchor="middle"
    fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 10.5 / 17)" fontWeight="calc(var(--nx-type-plotValue-weight) * 8 / 7)">{point.value ?? '—'}</text> : <g />;
}

/** Missing changes invalidate the running total until an explicit start establishes it. */
export function RungWaterfall({ data, height, width, animate = true, className = '', 'aria-label': label = 'Revenue from gross to net' }: RungWaterfallProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    let running: number | null = null;
    return data.map((point, index): StepPoint => {
      const value = point.kind === 'total' ? running : point.valueK !== null && Number.isSafeInteger(point.valueK) ? point.valueK : null;
      const before = running;
      if (point.kind === 'start') running = value;
      else if (point.kind === 'change') running = before !== null && value !== null && Number.isSafeInteger(before + value) ? before + value : null;
      const from = point.kind === 'change' ? before : 0;
      const to = running;
      const range: [number, number] | null = from !== null && to !== null && Number.isSafeInteger(Math.abs(to - from)) ? [Math.min(from, to), Math.max(from, to)] : null;
      return { index, label: point.label, kind: point.kind, value: range ? (point.kind === 'change' ? value : to) : null, range, broken: point.kind === 'change' && (value ?? 0) < 0 };
    });
  }, [data]);
  const minimum = Math.min(0, ...points.map((point) => point.range?.[0] ?? 0));
  const maximum = Math.max(0, ...points.map((point) => point.range?.[1] ?? 0)) + 5;
  return <div ref={ref} className={`nx-rung-waterfall flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="rung-waterfall" data-nx-animated={motion.isAnimationActive}>
    {!points.some((point) => point.range !== null) ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart data={points} accessibilityLayer title={label} desc="Each rung is one thousand dollars. Totals stand on zero; changes float at their running level. Broken rungs are deductions. Use the left and right arrow keys to inspect steps."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 34, bottom: 0, left: 34 }}>
          <XAxis dataKey="index" type="category" height={52} interval={0} tickLine={false} tickSize={0} tickMargin={12}
            tickFormatter={(index: number) => points[index]?.label ?? ''} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'calc(var(--nx-type-axis-weight) * 7 / 6)' }} />
          <YAxis type="number" hide domain={[minimum, maximum]} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.label} — {point.value === null ? 'Unavailable' : `${point.kind === 'change' && point.value > 0 ? '+' : ''}$${point.value}k`}
            </div> : null;
          }} />
          <Bar id={`${id}-steps`} dataKey="range" name="Revenue" fill="var(--nx-ink)" stroke="none" shape={StepRungs} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<StepLabel observations={points} />} />
          </Bar>
          {/* Recharts omits null interval rectangles and their LabelList entries. */}
          {points.filter((point) => point.range === null).map((point) => <StepLabel key={point.index} value={point.index} observations={points} />)}
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE RUNG = $1K · BROKEN RUNGS ARE DEDUCTIONS</div>
    </div>}
  </div>;
}
