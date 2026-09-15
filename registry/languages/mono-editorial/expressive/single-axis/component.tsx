'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface SingleAxisDatum { day: string; hour: number; tickets: number | null }
export interface SingleAxisProps {
  data: readonly SingleAxisDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface HourPoint { day: string; hour: number; tickets: number; index: number; row: number; position: number }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)'];

function HourMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: HourPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <g data-nx-observation={payload.index}><circle data-nx-hour={payload.index} cx={cx} cy={cy} r={payload.tickets * 1.3}
    fill={tones[payload.row] ?? 'var(--nx-faint)'} opacity={0.8} /></g>;
}

function DayLabels({ days }: { days: readonly string[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale || !days.length) return null;
  const labelY = yScale((days.length - 0.5) / days.length + 0.02);
  return <g pointerEvents="none" aria-hidden="true">
    {days.map((day, index) => <text key={day} x={5} y={yScale((index + 0.5) / days.length - 0.01)} dy={4.5} dominantBaseline="central"
      fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 9 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{day}</text>)}
    {Array.from({ length: 6 }, (_, index) => index * 4).map((hour) => <text key={hour} x={xScale(hour)} y={(labelY ?? 0) + 15} textAnchor="middle"
      fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)">{String(hour).padStart(2, '0')}</text>)}
  </g>;
}

/** Rows share the hour scale; the specimen's diameter is 2.6 pixels per ticket. */
export function SingleAxis({ data, height, width, animate = true, className = '', 'aria-label': label = 'Support load by day and hour' }: SingleAxisProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { days, points } = useMemo(() => {
    const days = [...new Set(data.map((point) => point.day))];
    const points = data.flatMap((point, index): HourPoint[] => {
      if (!Number.isFinite(point.hour) || point.hour < 0 || point.hour > 23 || point.tickets === null || !Number.isFinite(point.tickets) || point.tickets < 0) return [];
      const row = days.indexOf(point.day);
      return [{ day: point.day, hour: point.hour, tickets: point.tickets, row, index, position: (row + 0.5) / days.length + 0.02 }];
    });
    return { days, points };
  }, [data]);
  return <div ref={ref} className={`nx-single-axis flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="single-axis" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each row is a day and each dot an hourly ticket count. Dot diameter grows with ticket count. Use the left and right arrow keys to inspect observations."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 0, right: 14, bottom: 0, left: 52 }}>
          <XAxis dataKey="hour" type="number" hide domain={[0, 23]} />
          <YAxis dataKey="position" type="number" hide reversed domain={[0, 1]} />
          <DayLabels days={days} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as HourPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.day} {String(point.hour).padStart(2, '0')}:00 — {point.tickets} tickets</div> : null;
          }} />
          <Scatter id={`${id}-hours`} data={points} name="Tickets" fill="var(--nx-ink)" shape={HourMark} activeShape={HourMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
