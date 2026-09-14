'use client';

import { useId, useMemo } from 'react';
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface HairlineAreaDatum { day: string; valueK: number | null; axisLabel?: string }
export interface HairlineAreaProps {
  data: readonly HairlineAreaDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DayPoint { day: string; valueK: number | null; axisLabel: string; index: number; peak: boolean }
const variation = (index: number) => Math.abs((((index + 1) * 73856093) ^ (7 * 19349663)) % 1000) / 1000;

function DayHairline(props: unknown) {
  const { x, y, width, height, payload } = props as { x?: number; y?: number; width?: number; height?: number; payload?: DayPoint };
  if (x === undefined || y === undefined || width === undefined || height === undefined || !payload || payload.valueK === null) return <g />;
  return <line data-nx-day={payload.index} x1={x + width / 2} x2={x + width / 2} y1={y} y2={y + height} fill="none"
    stroke={payload.peak ? 'var(--nx-ink)' : 'var(--nx-muted)'} strokeWidth="calc(var(--nx-stroke-hairline) * 0.55 / 0.7)" opacity={payload.peak ? 1 : 0.5 + variation(payload.index) * 0.45} />;
}

function PeakDot(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: DayPoint };
  if (cx === undefined || cy === undefined || !payload?.peak || payload.valueK === null) return <g />;
  return <g data-nx-peak={payload.index} opacity={0.8} pointerEvents="none">
    <circle cx={cx} cy={cy} r={4.2} fill="var(--nx-ink)" />
    <text x={cx} y={cy - 12.2} dy="-0.5em" dominantBaseline="central" textAnchor="middle" fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
      fontSize="calc(var(--nx-type-plotValue-size) * 9.5 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{Math.round(payload.valueK)}k</text>
  </g>;
}

/** One library Bar per day makes the texture; a real Line follows its available tops. */
export function HairlineArea({ data, height, width, animate = true, className = '', 'aria-label': label = 'Daily values drawn as hairlines' }: HairlineAreaProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, maximum, available } = useMemo(() => {
    const clean = data.map((point, index) => ({ day: point.day, valueK: point.valueK !== null && Number.isFinite(point.valueK) && point.valueK >= 0 ? point.valueK : null, axisLabel: point.axisLabel ?? '', index }));
    const values = clean.flatMap((point) => point.valueK === null ? [] : [point.valueK]);
    const maximum = Math.max(0, ...values);
    const peak = clean.find((point) => point.valueK === maximum)?.index;
    return { points: clean.map((point): DayPoint => ({ ...point, peak: point.index === peak })), maximum, available: values.length };
  }, [data]);
  return <div ref={ref} className={`nx-hairline-area flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="hairline-area" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ComposedChart data={points} accessibilityLayer title={label} desc="Each hairline is one day from zero to its value; a line joins adjacent available tops. Missing days leave gaps. The highest available day is labelled. Use the left and right arrow keys to inspect days."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 26, right: 22, bottom: 0, left: 26 }}>
          <XAxis dataKey="index" type="category" height={46} ticks={points.filter((point) => point.axisLabel).map((point) => point.index)} interval={0}
            tickFormatter={(index: number) => points[index]?.axisLabel ?? ''} tickLine={false} tickMargin={8} tickSize={0}
            axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis hide type="number" domain={[0, maximum * 1.12 || 1]} />
          <Tooltip cursor={false} filterNull={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as DayPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.day} — {point.valueK === null ? 'unavailable' : `${Math.round(point.valueK)}k`}</div> : null;
          }} />
          <Bar id={`${id}-days`} dataKey="valueK" name="Daily value" barSize={1} shape={DayHairline} activeBar={false} {...motion} />
          <Line id={`${id}-tops`} dataKey="valueK" name="Daily value" type="linear" connectNulls={false} dot={PeakDot} activeDot={false}
            stroke="var(--nx-ink)" strokeWidth="calc(var(--nx-stroke-hairline) * 12 / 7)" {...motion} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE HAIRLINE = ONE DAY, FLOOR TO PEAK</div>
    </div>}
  </div>;
}
