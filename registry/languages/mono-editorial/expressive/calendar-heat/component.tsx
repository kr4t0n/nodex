'use client';

import { useId, useMemo } from 'react';
import { DefaultZIndexes, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZIndexLayer, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface CalendarHeatDatum { week: string; deploys: readonly (number | null)[] }
export interface CalendarHeatPeriod { week: number; label: string }
export interface CalendarHeatProps {
  data: readonly CalendarHeatDatum[];
  periods?: readonly CalendarHeatPeriod[];
  peakLabel?: string;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DayPoint { week: number; day: number; deploys: number; index: string; maximum: number; peak: boolean; peakLabel?: string }
const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function DeployDot(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: DayPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const radius = payload.deploys === 0 ? 0.75 : 1.1 + Math.sqrt(payload.deploys) * 1.55;
  const fill = payload.deploys === 0 ? 'var(--nx-plotFaint)' : payload.deploys > payload.maximum * 0.66 ? 'var(--nx-ink)' : payload.deploys > payload.maximum * 0.33 ? 'var(--nx-markMuted)' : 'var(--nx-markQuiet)';
  return <g data-nx-observation={payload.index} opacity={0.8}>
    <circle data-nx-deploys={payload.index} cx={cx} cy={cy} r={radius} fill={fill} />
  </g>;
}

function PeakNote({ point, weeks }: { point: DayPoint | undefined; weeks: number }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!point || !xScale || !yScale) return null;
  const cx = xScale(point.week); const cy = yScale(point.day);
  if (cx === undefined || cy === undefined) return null;
  const radius = 1.1 + Math.sqrt(point.deploys) * 1.55;
  const left = xScale(-0.5) ?? 0;
  const right = xScale(weeks - 0.5) ?? left;
  const top = yScale(-0.5) ?? 0;
  return <g aria-hidden="true" pointerEvents="none" opacity={0.8}>
    <circle data-nx-peak="true" cx={cx} cy={cy} r={radius + 3.5} fill="none" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="4 2" />
    <foreignObject x={left} y={0} width={Math.max(0, right - left)} height={Math.max(0, top - 12)}>
      <div data-nx-peak-note className="flex h-full items-center justify-center text-center text-[length:calc(var(--nx-type-axis-size)*7/8)] leading-tight text-[var(--nx-markMuted)] italic">{point.peakLabel ? `${point.peakLabel} — ` : ''}{point.deploys} deploys in a day</div>
    </foreignObject>
  </g>;
}

/** Week columns and weekday rows retain real zeros without inventing calendar dates. */
export function CalendarHeat({ data, periods = [], peakLabel, height, width, animate = true, className = '', 'aria-label': label = 'Daily deploy counts by week' }: CalendarHeatProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    const valid = data.flatMap((week, weekIndex) => week.deploys.flatMap((deploys, day) => day < 7 && deploys !== null && Number.isFinite(deploys) && deploys >= 0
      ? [{ week: weekIndex, day, deploys, index: `${weekIndex}:${day}` }] : []));
    const maximum = Math.max(0, ...valid.map((point) => point.deploys));
    const peak = maximum > 0 ? valid.find((point) => point.deploys === maximum)?.index : undefined;
    return valid.map((point): DayPoint => ({ ...point, maximum, peak: point.index === peak, peakLabel }));
  }, [data, peakLabel]);
  const labels = new Map(periods.filter((period) => Number.isInteger(period.week) && period.week >= 0 && period.week < data.length).map((period) => [period.week, period.label]));
  return <div ref={ref} className={`nx-calendar-heat flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="calendar-heat" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[720/260] min-h-[208px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 208 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each column is a week, Monday through Sunday from top to bottom. Dot size shows deploy count; tiny dots mean zero. Missing days have no mark. Use the left and right arrow keys to inspect days."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 18, bottom: 0, left: 0 }}>
          <XAxis dataKey="week" type="number" domain={[-0.5, data.length - 0.5]} height={46} ticks={[...labels.keys()]} interval={0}
            tickFormatter={(week: number) => labels.get(week) ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <YAxis dataKey="day" type="number" domain={[-0.5, 6.5]} reversed width={46} ticks={[0, 2, 4, 6]} interval={0}
            tickFormatter={(day: number) => weekdays[day] ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 6.5 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as DayPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{data[point.week]?.week} {weekdays[point.day]} — {point.deploys} deploys</div> : null;
          }} />
          <Scatter id={`${id}-deploys`} data={points} name="Deploys" fill="var(--nx-ink)" shape={DeployDot} activeShape={DeployDot} {...motion} />
          <ZIndexLayer zIndex={DefaultZIndexes.label}>
            <PeakNote point={points.find((point) => point.peak)} weeks={data.length} />
          </ZIndexLayer>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE DOT = ONE DAY · DOT AREA = DEPLOYS · TINY DOT = A QUIET DAY</div>
    </div>}
  </div>;
}
