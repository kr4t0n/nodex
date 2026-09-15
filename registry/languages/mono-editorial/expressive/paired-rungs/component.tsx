'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { RungMarks, rungCount } from '../../../../_shared/rung-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface PairedRungsDatum {
  plan: string;
  /** Whole thousands of dollars; null means unavailable. */
  beforeK: number | null;
  afterK: number | null;
}

export interface PairedRungsProps {
  data: readonly PairedRungsDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

function PlanRungs({ series, ...props }: BarShapeProps & { series: 'before' | 'after' }) {
  const scale = useYAxisScale();
  const xScale = useXAxisScale();
  const point = props.payload as PairedRungsDatum & { index: number };
  if (!scale || !xScale) return null;
  const after = series === 'after';
  const count = after ? point.afterK : point.beforeK;
  const center = xScale(point.index, { position: 'middle' });
  const bottom = scale(0);
  const unit = scale(1);
  if (center === undefined || bottom === undefined || unit === undefined) return null;
  const step = count ? props.height / count : bottom - unit;
  return <RungMarks x={center + (after ? 13 : -13)} bottom={bottom} step={step} count={count} width={[17, 5]} widthSeed={point.index + (after ? 7 : 2)}
    opacity={after ? [0.6, 0.4] : [0.5, 0.4]} opacitySeed={point.index + (after ? 8 : 3)} fill={after ? 'var(--nx-ink)' : 'var(--nx-markQuiet)'}
    observation={point.index} series={series} />;
}

function BeforeRungs(props: BarShapeProps) { return <PlanRungs {...props} series="before" />; }
function AfterRungs(props: BarShapeProps) { return <PlanRungs {...props} series="after" />; }

function PlanTotal({ value, observations }: LabelProps & { observations: readonly PairedRungsDatum[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = typeof value === 'number' ? observations[value] : undefined;
  const x = xScale?.(value, { position: 'middle' });
  const y = yScale?.((point?.afterK ?? 0) + 2);
  return point && x !== undefined && y !== undefined ? <text data-nx-total={value} x={x + 13} y={y - 5} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" opacity={0.8}
    fontSize="calc(var(--nx-type-plotValue-size) * 10.5 / 17)" fontWeight="calc(var(--nx-type-plotValue-weight) * 8 / 7)" pointerEvents="none">{point.afterK ?? '—'}</text> : <g />;
}

/** Two countable revenue stacks share each plan's category. */
export function PairedRungs({ data, height, width, animate = true, className = '', 'aria-label': label = 'Revenue by plan before and after' }: PairedRungsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.map((point, index) => ({ plan: point.plan, beforeK: rungCount(point.beforeK), afterK: rungCount(point.afterK), index })), [data]);
  const available = points.some((point) => point.beforeK !== null || point.afterK !== null);
  const ceiling = Math.max(0, ...points.flatMap((point) => [point.beforeK ?? 0, point.afterK ?? 0])) + 4;
  return <div ref={ref} className={`nx-paired-rungs flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="paired-rungs" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={`relative ${height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart data={points} accessibilityLayer title={label} desc="Each rung is one thousand dollars. Grey is before; ink is after. Use the left and right arrow keys to inspect both measures for a plan."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 34, bottom: 0, left: 34 }} barSize={26} barGap={0}>
          <XAxis dataKey="index" type="category" height={52} interval={0} tickLine={false} tickSize={0} tickMargin={12}
            tickFormatter={(index: number) => points[index]?.plan ?? ''} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'calc(var(--nx-type-axis-weight) * 7 / 6)', fontFamily: 'var(--nx-font-sans)' }} />
          <YAxis type="number" hide domain={[0, ceiling]} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.plan} — {point.beforeK === null ? 'Unavailable' : `$${point.beforeK}k`} → {point.afterK === null ? 'Unavailable' : `$${point.afterK}k`} MRR
            </div> : null;
          }} />
          <Bar id={`${id}-before`} dataKey="beforeK" name="Before" fill="var(--nx-markQuiet)" stroke="none" shape={BeforeRungs} activeBar={false} {...motion} />
          <Bar id={`${id}-after`} dataKey="afterK" name="After" fill="var(--nx-ink)" stroke="none" shape={AfterRungs} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<PlanTotal observations={points} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE RUNG = $1K · GREY = BEFORE, INK = AFTER</div>
    </div>}
  </div>;
}
