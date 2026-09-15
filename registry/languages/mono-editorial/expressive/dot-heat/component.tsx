'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DotHeatDatum { day: string; hour: number; tickets: number | null }
export interface DotHeatProps {
  data: readonly DotHeatDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface HourPoint { day: string; hour: number; tickets: number; row: number; index: number; maximum: number; peak: boolean }

function TicketDot(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: HourPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const radius = payload.tickets === 0 ? 0.8 : 1.2 + Math.sqrt(payload.tickets) * 2.1;
  const fill = payload.tickets === 0 ? 'var(--nx-plotFaint)' : payload.tickets > payload.maximum * 0.66 ? 'var(--nx-ink)' : payload.tickets > payload.maximum * 0.33 ? 'var(--nx-markMuted)' : 'var(--nx-markQuiet)';
  return <g data-nx-observation={payload.index} opacity={0.8}>
    <circle data-nx-ticket={payload.index} cx={cx} cy={cy} r={radius} fill={fill} />
    {payload.peak && <circle data-nx-peak="true" cx={cx} cy={cy} r={radius + 3.5} fill="none" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="4 2" />}
  </g>;
}

/** A dot matrix with the original square-root size curve and discrete relative tones. */
export function DotHeat({ data, height, width, animate = true, className = '', 'aria-label': label = 'Support tickets by day and hour' }: DotHeatProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { days, hours, points, maximum } = useMemo(() => {
    const days = [...new Set(data.map((point) => point.day))];
    const hours = [...new Set(data.filter((point) => Number.isFinite(point.hour) && point.hour >= 0 && point.hour <= 23).map((point) => point.hour))].sort((a, b) => a - b);
    const valid = data.flatMap((point, index) => Number.isFinite(point.hour) && point.hour >= 0 && point.hour <= 23 && point.tickets !== null && Number.isFinite(point.tickets) && point.tickets >= 0
      ? [{ day: point.day, hour: point.hour, tickets: point.tickets, row: days.indexOf(point.day), index }] : []);
    const maximum = Math.max(0, ...valid.map((point) => point.tickets));
    const peak = maximum > 0 ? valid.find((point) => point.tickets === maximum)?.index : undefined;
    return { days, hours, maximum, points: valid.map((point): HourPoint => ({ ...point, maximum, peak: point.index === peak })) };
  }, [data]);
  return <div ref={ref} className={`nx-dot-heat flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="dot-heat" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Rows are days; columns are hours. Dot size shows ticket count. Tiny dots mean zero; missing observations have no mark. Use the left and right arrow keys to inspect observations."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 22, right: 24, bottom: 0, left: 0 }}>
          <XAxis dataKey="hour" type="number" domain={[(hours[0] ?? 0) - 0.5, (hours.at(-1) ?? 0) + 0.5]} height={54} ticks={hours.filter((_, index) => index % 2 === 0)} interval={0}
            tickFormatter={(hour: number) => `${hour}:00`} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-faint)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis dataKey="row" type="number" domain={[-0.5, days.length - 0.5]} reversed width={56} ticks={days.map((_, index) => index)} interval={0}
            tickFormatter={(row: number) => days[row] ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-markMuted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as HourPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.day} {point.hour}:00 — {point.tickets} tickets</div> : null;
          }} />
          <Scatter id={`${id}-tickets`} data={points} name="Tickets" fill="var(--nx-ink)" shape={TicketDot} activeShape={TicketDot} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">DOT AREA = TICKETS{maximum > 0 ? ` · DASHED RING = THE PEAK, ${maximum}` : ''} · TINY DOT = A QUIET HOUR</div>
    </div>}
  </div>;
}
