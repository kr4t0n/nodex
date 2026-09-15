'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { RungMarks, rungCount } from '../../../../_shared/rung-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface RungHistogramDatum {
  fromHours: number;
  toHours: number;
  /** One mark per ticket; null is unavailable. */
  tickets: number | null;
}

export interface RungHistogramProps {
  data: readonly RungHistogramDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface BinPoint extends RungHistogramDatum { index: number; middle: number }

function TicketRungs(props: BarShapeProps) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = props.payload as BinPoint;
  const x = xScale?.(point.middle);
  const bottom = yScale?.(0);
  const next = yScale?.(1);
  if (x === undefined || bottom === undefined || next === undefined) return null;
  return <RungMarks x={x} bottom={bottom} step={point.tickets ? props.height / point.tickets : bottom - next}
    count={point.tickets} width={[18, 5]} widthSeed={point.index + 2} opacity={[0.55, 0.45]} opacitySeed={point.index + 4}
    fill="var(--nx-ink)" observation={point.index} series="tickets" countingDots countingDotOffset={14} countingDotRadius={0.7} countingDotOpacity={1} />;
}

function PeakLabel({ value, peak }: LabelProps & { peak: BinPoint | undefined }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = value === peak?.index ? peak : undefined;
  const x = point ? xScale?.(point.middle) : undefined;
  const y = point ? yScale?.((point.tickets ?? 0) + 2) : undefined;
  return point && x !== undefined && y !== undefined ? <text data-nx-peak={value} x={x} y={y} dy="-0.5em" textAnchor="middle"
    fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 11 / 17)" fontWeight="calc(var(--nx-type-plotValue-weight) * 8 / 7)" pointerEvents="none">{point.tickets}</text> : <g />;
}

function BinEdges({ observations }: { observations: readonly BinPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const y = yScale?.(0);
  if (!xScale || y === undefined) return null;
  const edges = [...new Set(observations.flatMap((point) => [point.fromHours, point.toHours]))];
  return <g pointerEvents="none" aria-hidden="true">{edges.map((edge) => <line key={edge} x1={xScale(edge)} x2={xScale(edge)} y1={y} y2={y + 7}
    stroke="var(--nx-plotFloor)" strokeWidth="calc(var(--nx-stroke-hairline) * 6 / 7)" />)}</g>;
}

/** Continuous time intervals retain one countable rung per observed ticket. */
export function RungHistogram({ data, height, width, animate = true, className = '', 'aria-label': label = 'Ticket resolution times by interval' }: RungHistogramProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.map((point, index): BinPoint => ({ ...point, index,
    middle: point.fromHours + (point.toHours - point.fromHours) / 2, tickets: rungCount(point.tickets),
  })).filter((point) => Number.isFinite(point.fromHours) && Number.isFinite(point.toHours) && point.fromHours >= 0 && point.toHours > point.fromHours), [data]);
  const available = points.some((point) => point.tickets !== null);
  const complete = points.length === data.length && points.every((point) => point.tickets !== null);
  const total = points.reduce((sum, point) => sum + (point.tickets ?? 0), 0);
  const peak = points.reduce<BinPoint | undefined>((best, point) => point.tickets !== null && (!best || point.tickets > (best.tickets ?? -1)) ? point : best, undefined);
  let cumulative = 0;
  const median = complete && total > 0 ? points.find((point) => { cumulative += point.tickets ?? 0; return cumulative >= total / 2; }) : undefined;
  const floor = Math.min(0, ...points.map((point) => point.fromHours));
  const ceiling = Math.max(1, ...points.map((point) => point.toHours));
  return <div ref={ref} className={`nx-rung-histogram flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="rung-histogram" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart data={points} accessibilityLayer title={label} desc="One rung is one ticket. Dots mark every fifth ticket; the dashed flag marks the interval containing the median. Use the left and right arrow keys to inspect intervals."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 26, bottom: 0, left: 34 }}>
          <XAxis dataKey="middle" type="number" domain={[floor, ceiling]} allowDataOverflow height={56} ticks={points.filter((_, index) => index % 2 === 0).map((point) => point.middle)}
            tickSize={7} tickFormatter={(value: number) => `${points.find((point) => point.middle === value)?.fromHours ?? value}h`} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tickLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis type="number" hide domain={[0, (peak?.tickets ?? 0) + 6]} />
          <BinEdges observations={points} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as BinPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.tickets === null ? 'Unavailable' : `${point.tickets}${complete ? ` of ${total}` : ''} tickets took ${point.fromHours}–${point.toHours}h`}
            </div> : null;
          }} />
          {median && <ReferenceLine x={median.middle} stroke="var(--nx-muted)" strokeWidth="calc(var(--nx-stroke-hairline) * 9 / 7)" strokeDasharray="3.6 1.8"
            label={{ value: 'HALF RESOLVED BY HERE', position: 'top', fill: 'var(--nx-markMuted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-pageTitle-weight)' }} />}
          <Bar id={`${id}-tickets`} dataKey="tickets" name="Tickets" fill="var(--nx-ink)" stroke="none" shape={TicketRungs} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<PeakLabel peak={peak} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">
        ONE RUNG = ONE TICKET{complete && total === 100 ? ' IN A HUNDRED' : ''} · {points.every((point) => point.toHours - point.fromHours === 2) ? 'BINS OF TWO HOURS' : 'BINS IN HOURS'} · DOT MARKS EVERY FIFTH
      </div>
    </div>}
  </div>;
}
