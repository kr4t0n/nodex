'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface BarcodeLollipopDatum { day: string; peakUsers: number | null; weekend: boolean; axisLabel?: string }
export interface BarcodeLollipopProps {
  data: readonly BarcodeLollipopDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DayPoint { day: string; peakUsers: number; weekend: boolean; index: number; highlighted: boolean }
const texture = (day: number) => Math.abs(((day * 73856093) ^ (9 * 19349663)) % 1000) / 1000;

function DayPeak(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: DayPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const radius = payload.highlighted ? 4.5 : 2.3;
  return <g data-nx-observation={payload.index} opacity={0.8}>
    <circle data-nx-peak-day={payload.index} data-nx-weekend={payload.weekend} cx={cx} cy={cy} r={radius} fill={payload.weekend ? 'var(--nx-bg)' : 'var(--nx-ink)'} stroke={payload.weekend ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-emphasis)" />
    {payload.highlighted && <text data-nx-highlight={payload.index} x={cx} y={cy - radius - 6} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
      fontSize="calc(var(--nx-type-plotValue-size) * 9 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{Math.round(payload.peakUsers)}</text>}
  </g>;
}

function CalendarField({ points, days, ceiling }: { points: readonly DayPoint[]; days: number; ceiling: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  const bottom = yScale(0) ?? 0; const top = yScale(ceiling) ?? 0;
  return <g pointerEvents="none" aria-hidden="true">
    {Array.from({ length: days }, (_, day) => {
      const x = xScale(day) ?? 0;
      return <Curve key={day} data-nx-calendar-day={day} points={[{ x, y: bottom }, { x, y: top }]} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />;
    })}
    {points.map((point) => {
      const x = xScale(point.index) ?? 0;
      return <Curve key={point.index} data-nx-gravity={point.index} points={[{ x, y: yScale(point.peakUsers) ?? 0 }, { x, y: yScale(Math.max(0, point.peakUsers - 14 - texture(point.index + 1) * 26)) ?? 0 }]}
        type="linear" fill="none" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" />;
    })}
  </g>;
}

/** Day positions and stems use library scales; only available peaks are observations. */
export function BarcodeLollipop({ data, height, width, animate = true, className = '', 'aria-label': label = 'Daily peak users across a calendar field' }: BarcodeLollipopProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => {
    const valid = data.flatMap((day, index) => day.peakUsers !== null && Number.isFinite(day.peakUsers) && day.peakUsers >= 0 ? [{ day: day.day, peakUsers: day.peakUsers, weekend: day.weekend, index }] : []);
    const top: number[] = [];
    for (const day of [...valid].sort((a, b) => b.peakUsers - a.peakUsers || a.index - b.index)) {
      if (top.every((index) => Math.abs(day.index - index) >= 6)) top.push(day.index);
      if (top.length === 3) break;
    }
    return valid.map((day): DayPoint => ({ ...day, highlighted: top.includes(day.index) }));
  }, [data]);
  const maximum = Math.max(0, ...points.map((point) => point.peakUsers));
  const headroom = maximum * 1.18;
  const ceiling = Number.isFinite(headroom) && headroom > 0 ? headroom : maximum || 1;
  return <div ref={ref} className={`nx-barcode-lollipop flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="barcode-lollipop" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No peak observations available.</div> : <div className={height === undefined ? 'relative aspect-[620/300] min-h-[240px] w-full' : 'relative min-h-0 w-full flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 261 }}>
        <ScatterChart accessibilityLayer title={label} desc="One hairline is a day and each dot its peak. Hollow dots are weekends; stems are decorative. Up to three high readings at least six day positions apart are labelled. Use the left and right arrow keys to inspect days."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 20, right: 22, bottom: 0, left: 22 }}>
          <XAxis dataKey="index" type="number" domain={[-1, data.length]} height={42} ticks={data.flatMap((day, index) => day.axisLabel === undefined ? [] : [index])} interval={0} tickLine={false} axisLine={false} tickSize={0} tickMargin={8}
            tickFormatter={(index: number) => data[index]?.axisLabel ?? ''} tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis dataKey="peakUsers" type="number" hide domain={[0, ceiling]} />
          <CalendarField points={points} days={data.length} ceiling={ceiling} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as DayPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.day} — {Math.round(point.peakUsers)} peak users</div> : null;
          }} />
          <Scatter id={`${id}-peaks`} data={points} name="Peak users" fill="var(--nx-ink)" shape={DayPeak} activeShape={DayPeak} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE HAIRLINE = ONE DAY · DOT = THAT DAY’S PEAK · HOLLOW = WEEKEND</div>
    </div>}
  </div>;
}
