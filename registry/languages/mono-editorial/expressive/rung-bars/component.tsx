'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { RungMarks, rungCount } from '../../../../_shared/rung-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface RungBarsDatum {
  plan: string;
  /** Whole thousands of dollars; null means unavailable. */
  mrrK: number | null;
}

export interface RungBarsProps {
  data: readonly RungBarsDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

function PlanRungs(props: BarShapeProps) {
  const scale = useYAxisScale();
  const xScale = useXAxisScale();
  const point = props.payload as RungBarsDatum & { index: number };
  if (!scale || !xScale) return null;
  const x = xScale(point.index, { position: 'middle' });
  const bottom = scale(0);
  const unit = scale(1);
  if (x === undefined || bottom === undefined || unit === undefined) return null;
  const step = point.mrrK ? props.height / point.mrrK : bottom - unit;
  return <RungMarks x={x} bottom={bottom} step={step} count={point.mrrK} width={[25, 6]} widthSeed={point.index + 2}
    opacity={[0.5, 0.5]} opacitySeed={point.index + 4} fill="var(--nx-ink)" observation={point.index} series="mrr" countingDots />;
}

function PlanTotal({ value, observations }: LabelProps & { observations: readonly RungBarsDatum[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = typeof value === 'number' ? observations[value] : undefined;
  const x = xScale?.(value, { position: 'middle' });
  const y = yScale?.((point?.mrrK ?? 0) + 2);
  return point && x !== undefined && y !== undefined ? <text data-nx-total={value} x={x} y={y} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" opacity={0.8}
    fontSize="calc(var(--nx-type-plotValue-size) * 11 / 17)" fontWeight="calc(var(--nx-type-plotValue-weight) * 8 / 7)" pointerEvents="none">{point.mrrK ?? '—'}</text> : <g />;
}

/** Each rung is $1K; the dots make every fifth unit countable. */
export function RungBars({ data, height, width, animate = true, className = '', 'aria-label': label = 'Revenue by plan, rung by rung' }: RungBarsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.map((point, index) => ({ plan: point.plan, mrrK: rungCount(point.mrrK), index })), [data]);
  const available = points.some((point) => point.mrrK !== null);
  const ceiling = Math.max(0, ...points.map((point) => point.mrrK ?? 0)) + 4;
  return <div ref={ref} className={`nx-rung-bars flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="rung-bars" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={`relative ${height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart data={points} accessibilityLayer title={label} desc="One rung is one thousand dollars of monthly recurring revenue. A dot marks every fifth rung. Use the left and right arrow keys to inspect plans."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 34, bottom: 0, left: 34 }}>
          <XAxis dataKey="index" type="category" height={54} interval={0} tickLine={false} tickSize={0} tickMargin={12}
            tickFormatter={(index: number) => points[index]?.plan ?? ''} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'calc(var(--nx-type-axis-weight) * 7 / 6)', fontFamily: 'var(--nx-font-sans)' }} />
          <YAxis type="number" hide domain={[0, ceiling]} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.plan} — {point.mrrK === null ? 'Unavailable' : `$${point.mrrK}k MRR`}
            </div> : null;
          }} />
          <Bar id={`${id}-mrr`} dataKey="mrrK" name="MRR" fill="var(--nx-ink)" stroke="none" shape={PlanRungs} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<PlanTotal observations={points} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE RUNG = $1K · DOT MARKS EVERY FIFTH</div>
    </div>}
  </div>;
}
