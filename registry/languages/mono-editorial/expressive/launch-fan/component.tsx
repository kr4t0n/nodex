'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface LaunchFanDatum { feature: string; week: number | null }
export interface LaunchFanProps {
  data: readonly LaunchFanDatum[];
  guideWeeks: readonly number[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface LaunchPoint extends LaunchFanDatum { index: number; angle: number; x: number; y: number }
const radiusOf = (week: number) => 56 + week * 9.7;
function at(radius: number, degrees: number) { const angle = degrees * Math.PI / 180; return { x: radius * Math.cos(angle), y: -radius * Math.sin(angle) }; }
function LaunchMark(props: unknown) {
  const { payload, cx, cy } = props as { payload?: LaunchPoint; cx?: number; cy?: number };
  if (!payload || cx === undefined || cy === undefined) return <g />;
  return <g data-nx-observation={payload.index} opacity={0.8}>
    {payload.week !== null && <circle data-nx-launch={payload.index} cx={cx} cy={cy} r={4} fill="var(--nx-ink)" />}
    <text data-nx-launch-label={payload.index} x={cx + 11} y={cy} dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-legend-size) * 7.5 / 9)" fontWeight="var(--nx-type-cardTitle-weight)">{payload.feature} · {payload.week === null ? '—' : `W${payload.week}`}</text>
  </g>;
}
function FanGuides({ rows, guides }: { rows: readonly LaunchPoint[]; guides: readonly number[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  const point = (value: { x: number; y: number }) => ({ x: xScale(value.x) ?? 0, y: yScale(value.y) ?? 0 });
  return <g pointerEvents="none" aria-hidden="true">
    {guides.map(week => {
      const radius = radiusOf(week); const label = point(at(radius, -88));
      return <g key={week}>
        <Curve data-nx-week-guide={week} points={Array.from({ length: 25 }, (_, index) => point(at(radius, -84 + index / 24 * 76)))} type="linear" fill="none" stroke="var(--nx-plotFaint)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="2 5" />
        <text data-nx-week-label={week} x={label.x - 5} y={label.y} textAnchor="end" dominantBaseline="central" fill="var(--nx-markQuiet)" opacity={0.8} fontSize="calc(var(--nx-type-axis-size) * 6.5 / 8)" fontWeight="var(--nx-type-subtitle-weight)">W{week}</text>
      </g>;
    })}
    {rows.filter(row => row.week !== null && row.week > 0).map(row => <Curve key={row.index} data-nx-spoke={row.index} points={[point(at(radiusOf(0), row.angle)), point(row)]} type="linear" fill="none" stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-hairline)" />)}
  </g>;
}

/** A real launch series uses a fixed fan angle and the original week-to-radius calibration. */
export function LaunchFan({ data, guideWeeks, height, width, animate = true, className = '', 'aria-label': label = 'Feature launches by week' }: LaunchFanProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): LaunchPoint => {
    const week = row.week !== null && Number.isFinite(row.week) && row.week >= 0 ? row.week : null;
    const angle = -84 + index * 76 / Math.max(1, data.length - 1);
    return { feature: row.feature, week, index, angle, ...at(radiusOf(week ?? 0), angle) };
  }), [data]);
  const guides = [...new Set(guideWeeks.filter(value => Number.isFinite(value) && value >= 0))].sort((a, b) => a - b);
  const available = rows.some(row => row.week !== null);
  const reach = Math.max(radiusOf(Math.max(0, ...rows.map(row => row.week ?? 0))) + 30, ...guides.map(radiusOf));
  return <div ref={ref} className={`nx-launch-fan flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="launch-fan" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No launch weeks available.</div> : <div className={height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Caller order assigns spokes from the leading edge. Distance along each spoke shows the launch week; dotted arcs are reference weeks. Use the left and right arrow keys to inspect features."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 20, bottom: 24, left: 26, right: 26 }}>
          <XAxis dataKey="x" type="number" hide domain={[-18, reach]} />
          <YAxis dataKey="y" type="number" hide domain={[0, reach]} />
          <FanGuides rows={rows} guides={guides} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as LaunchPoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.feature} · {row.week === null ? 'Unavailable' : `W${row.week}`}</div> : null;
          }} />
          <Scatter id={`${id}-launches`} data={rows} name="Launch weeks" fill="var(--nx-ink)" shape={LaunchMark} activeShape={LaunchMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
