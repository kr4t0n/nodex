'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, AreaRevealShape, ResponsiveContainer, Tooltip, XAxis, YAxis, type AreaRevealShapeProps } from 'recharts';
import { constrainedCurve } from '../../../../_shared/constrained-curve';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DrawInCounterDatum { day: string; bookingsK: number | null; axisLabel?: string }
export interface DrawInCounterProps {
  data: readonly DrawInCounterDatum[];
  periodLabel: string;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface BookingPoint extends DrawInCounterDatum { index: number; cumulativeK: number | null; plottedK: number | null }
const smoothing = constrainedCurve(0.2);
function Headline({ total, period, progress = 1 }: { total: number | null; period: string; progress?: number }) {
  return <g pointerEvents="none" stroke="none">
    <text data-nx-total data-nx-count-progress={progress} x={16} y={24} dominantBaseline="central" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 32 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{total === null ? '—' : `$${(total * progress / 1000).toFixed(2)}M`}</text>
    <text data-nx-period x={16} y={51} dominantBaseline="central" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-legend-size) * 10 / 9)" fontWeight="var(--nx-type-legend-weight)">{period}</text>
  </g>;
}
function CumulativeShape(props: AreaRevealShapeProps & { total: number | null; period: string }) {
  const { total, period, ...area } = props;
  return <><AreaRevealShape {...area} isEntrance /><Headline total={total} period={period} progress={area.isAnimating ? area.animationElapsedTime : 1} /></>;
}

/** The library's Area animation drives the headline through its public shape progress. */
export function DrawInCounter({ data, periodLabel, height, width, animate = true, className = '', 'aria-label': label = 'Cumulative bookings over the supplied period' }: DrawInCounterProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => {
    let sum: number | null = 0;
    return data.map((row, index): BookingPoint => {
      const bookingsK = row.bookingsK !== null && Number.isFinite(row.bookingsK) && row.bookingsK >= 0 ? row.bookingsK : null;
      sum = sum !== null && bookingsK !== null && Number.isFinite(sum + bookingsK) ? sum + bookingsK : null;
      return { day: row.day, axisLabel: row.axisLabel, bookingsK, cumulativeK: sum, plottedK: sum === null ? null : Math.round(sum), index };
    });
  }, [data]);
  const available = rows.some(row => row.cumulativeK !== null); const total = rows.at(-1)?.cumulativeK ?? null;
  const maximum = Math.max(0, ...rows.map(row => row.cumulativeK ?? 0)); const ceiling = maximum * 1.06 || 1;
  return <div ref={ref} className={`nx-draw-in-counter flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="draw-in-counter" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No cumulative bookings available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <AreaChart data={rows} accessibilityLayer title={label} desc="The headline is the exact total; the plotted cumulative values are rounded to whole thousands. A missing day makes later totals unavailable. Use the left and right arrow keys to inspect days."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 64, bottom: 0, left: 14, right: 20 }}>
          <defs><linearGradient id={`${id}-wash`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--nx-ink)" stopOpacity={0.14} /><stop offset="100%" stopColor="var(--nx-ink)" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="index" type="number" domain={rows.length === 1 ? [-0.5, 0.5] : [0, rows.length - 1]} height={24} ticks={rows.filter(row => row.axisLabel).map(row => row.index)} interval={0} axisLine={false} tickLine={false} tickSize={0} tickMargin={8}
            tick={({ x, y, payload }) => <text x={x} y={y} dy="0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-faint)" fontSize="calc(var(--nx-type-axis-size) * 9 / 8)" fontWeight="var(--nx-type-axis-weight)">{rows[payload.value]?.axisLabel}</text>} />
          <YAxis type="number" hide domain={[0, ceiling]} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const row = typeof index === 'number' ? rows[index] : undefined;
            return active && row ? <div role="status" className="sr-only">{row.day} — {row.cumulativeK === null ? 'Unavailable' : `$${row.cumulativeK.toFixed(2)}K cumulative`}</div> : null;
          }} />
          {rows.length === 1 && <Headline total={total} period={periodLabel} />}
          <Area id={`${id}-bookings`} className="nx-cumulative-area" dataKey="plottedK" name="Cumulative bookings" type={smoothing} baseValue={0} connectNulls={false} stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-emphasis)' }} fill={`url(#${id}-wash)`} fillOpacity={1}
            dot={rows.length === 1 ? { r: 2.2, fill: 'var(--nx-ink)', stroke: 'none' } : false} activeDot={false} shape={props => <CumulativeShape {...props} total={total} period={periodLabel} />} animationInterpolateFn={items => (items ?? []).flatMap(item => item.status === 'removed' ? [] : [item.next])} {...motion} />
        </AreaChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
