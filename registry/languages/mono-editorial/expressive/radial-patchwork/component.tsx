'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Sector, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface RadialPatchworkDatum { hour: number | null; spanDegrees: number | null; filesTouched: number | null; paged: boolean }
export interface RadialPatchworkProps {
  data: readonly RadialPatchworkDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DeployPoint { index: number; x: number; y: number; reading: { hour: number; spanDegrees: number; filesTouched: number; paged: boolean } | null }
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
function at(radius: number, degrees: number) { const angle = degrees * Math.PI / 180; return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }; }
function DeployWedge(props: unknown) {
  const { payload, cx, cy, isAnimating, animationElapsedTime } = props as { payload?: DeployPoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const reading = payload.reading;
  if (!reading || reading.filesTouched <= 96 || reading.spanDegrees === 0) return <g data-nx-observation={payload.index} />;
  const scale = Math.min(Math.abs((xScale(1) ?? 0) - (xScale(0) ?? 0)), Math.abs((yScale(1) ?? 0) - (yScale(0) ?? 0)));
  const inner = 16 * scale; const outer = reading.filesTouched / 6 * scale; const progress = isAnimating ? animationElapsedTime ?? 0 : 1; const start = 90 - reading.hour * 15;
  return <g data-nx-observation={payload.index}><Sector data-nx-deploy={payload.index} data-nx-incident={reading.paged} data-nx-radius={outer} data-nx-angle={start} data-nx-span={reading.spanDegrees}
    cx={cx} cy={cy} innerRadius={inner} outerRadius={inner + (outer - inner) * progress} startAngle={start} endAngle={start - reading.spanDegrees}
    fill={reading.paged ? 'none' : 'var(--nx-ink)'} stroke={reading.paged ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-emphasis)" opacity={reading.paged ? 1 : 0.07 + random(payload.index + 1, 6) * 0.09} /></g>;
}
function Dial() {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const point = (radius: number, degrees: number) => { const p = at(radius, degrees); return { x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 }; };
  return <g pointerEvents="none" aria-hidden="true">
    {Array.from({ length: 96 }, (_, index) => <Curve key={index} data-nx-clock-tick={index} points={[point(140, 90 - index * 3.75), point(index % 4 === 0 ? 146 : 143, 90 - index * 3.75)]} type="linear" fill="none" stroke="var(--nx-faint)" strokeWidth={index % 4 === 0 ? 'var(--nx-stroke-mark)' : 'calc(var(--nx-stroke-mark) / 2)'} />)}
    {[0, 6, 12, 18].map(hour => { const p = point(157, 90 - hour * 15); return <text key={hour} data-nx-clock-label={hour} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" opacity={0.8} fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-cardTitle-weight)">{String(hour).padStart(2, '0')}</text>; })}
    <circle cx={xScale(0)} cy={yScale(0)} r={3} fill="var(--nx-ink)" opacity={0.8} />
  </g>;
}

/** Native observation events and cartesian scales place independent, overlapping library sectors. */
export function RadialPatchwork({ data, height, width, animate = true, className = '', 'aria-label': label = 'Deployment times and files touched' }: RadialPatchworkProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): DeployPoint => { const { hour, spanDegrees, filesTouched, paged } = row;
    const reading = typeof hour === 'number' && Number.isFinite(hour) && hour >= 0 && hour < 24 && typeof spanDegrees === 'number' && Number.isFinite(spanDegrees) && spanDegrees >= 0 && spanDegrees <= 360 && typeof filesTouched === 'number' && Number.isFinite(filesTouched) && filesTouched >= 0 ? { hour, spanDegrees, filesTouched, paged } : null;
    return { index, x: 0, y: 0, reading }; }), [data]);
  const available = rows.some(row => row.reading !== null); const reach = Math.max(174, ...rows.map(row => (row.reading?.filesTouched ?? 0) / 6 + 34));
  return <div ref={ref} className={`nx-radial-patchwork flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="radial-patchwork" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No deployment readings available.</div> : <div className={height === undefined ? 'relative aspect-[420/380] min-h-[304px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 489 }}>
        <ScatterChart accessibilityLayer title={label} desc="Clockwise angle shows time of day and radial reach shows files touched. Overlapping translucent wedges accumulate ink; outlined wedges triggered incidents. The central hole masks reaches of 96 files or fewer. Use the left and right arrow keys to inspect deployments."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 10, bottom: 26, left: 10, right: 10 }}>
          <XAxis dataKey="x" type="number" hide domain={[-reach, reach]} />
          <YAxis dataKey="y" type="number" hide domain={[-reach, reach]} />
          <Dial />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as DeployPoint | undefined; const reading = row?.reading;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">deploy #{row.index + 1} — {reading ? reading.paged ? 'triggered an incident' : `${String(Math.floor(reading.hour)).padStart(2, '0')}:${String(Math.floor((reading.hour % 1) * 60)).padStart(2, '0')} · ${Math.round(reading.filesTouched)} files` : 'Unavailable'}</div> : null;
          }} />
          <Scatter id={`${id}-deploys`} data={rows} name="Deployments" fill="var(--nx-ink)" shape={DeployWedge} activeShape={DeployWedge} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[length:calc(var(--nx-type-legend-size)*7.5/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">OUTLINED = TRIGGERED AN INCIDENT</div>
    </div>}
  </div>;
}
