'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface JitterStripDatum { hours: number | null; band: number }
export interface JitterStripProps {
  data: readonly JitterStripDatum[];
  bands: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface TicketPoint { hours: number; band: number; index: number }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)'];

function TicketDot(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: TicketPoint };
  const area = usePlotArea();
  if (cx === undefined || cy === undefined || !payload || !area || cy + 3.5 < area.y || cy - 3.5 > area.y + area.height) return <g />;
  return <g data-nx-observation={payload.index}><circle data-nx-ticket={payload.index} cx={cx} cy={cy} r={3.5}
    fill={tones[Math.round(payload.band)] ?? 'var(--nx-ink)'} opacity={0.62} /></g>;
}

function BandLabels({ bands }: { bands: readonly string[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const area = usePlotArea();
  if (!xScale || !yScale || !area) return null;
  return <g aria-hidden="true" pointerEvents="none">
    {bands.map((band, index) => <text key={index} x={(xScale(0) ?? area.x) - 11} y={yScale(index)} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" opacity={0.8}
      fontSize="calc(var(--nx-type-axis-size) * 9 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{band}</text>)}
    <text x={area.x + area.width + 15} y={yScale(0)} dominantBaseline="central" fill="var(--nx-faint)" fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)">HOURS TO RESOLVE</text>
  </g>;
}

/** Fractional band coordinates carry the caller's jitter; every ticket is one library observation. */
export function JitterStrip({ data, bands, height, width, animate = true, className = '', 'aria-label': label = 'Time to resolve by priority' }: JitterStripProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => data.flatMap((point, index): TicketPoint[] => point.hours !== null && Number.isFinite(point.hours) && point.hours >= 0 && Number.isFinite(point.band)
    ? [{ hours: point.hours, band: point.band, index }] : []), [data]);
  return <div ref={ref} className={`nx-jitter-strip flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="jitter-strip" data-nx-animated={motion.isAnimationActive}>
    {!points.length || !bands.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each dot is a ticket. Horizontal position shows hours to resolve; fractional vertical positions reveal overlapping observations. Use the left and right arrow keys to inspect tickets."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 14, right: 105.55, bottom: 0, left: 86 }}>
          <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-hairline) * 10 / 7)" />
          <XAxis dataKey="hours" type="number" domain={[0, 'auto']} tickCount={8} height={30} tickSize={0} tickMargin={8} tickLine={false} axisLine={false}
            tickFormatter={(value: number) => `${value}h`} tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 9.5 / 8)', fontWeight: 'var(--nx-type-subtitle-weight)' }} />
          <YAxis dataKey="band" type="number" hide reversed allowDataOverflow domain={[-0.6, bands.length - 0.4]} />
          <BandLabels bands={bands} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as TicketPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{bands[Math.round(point.band)] ?? ''} — {point.hours.toFixed(1)}h to resolve</div> : null;
          }} />
          <Scatter className="[clip-path:none]" id={`${id}-tickets`} data={points} name="Tickets" fill="var(--nx-ink)" shape={TicketDot} activeShape={TicketDot} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
