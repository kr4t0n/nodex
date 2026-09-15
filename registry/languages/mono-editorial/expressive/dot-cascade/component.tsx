'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DotCascadeDatum { cause: string; incidents: number | null }
export interface DotCascadeProps {
  data: readonly DotCascadeDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface CausePoint extends DotCascadeDatum { index: number; floor: number; top: number; count: number }
function IncidentStack(props: unknown) {
  const { payload } = props as { payload?: CausePoint }; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || !xScale || !yScale) return <g />;
  const x = xScale(payload.index, { position: 'middle' }); const y = yScale(payload.top) ?? 0;
  return <g data-nx-observation={payload.index}>
    <g pointerEvents="none" fill="var(--nx-markQuiet)" opacity={0.9}>{Array.from({ length: Math.max(0, payload.count - 1) }, (_, unit) => <circle key={unit} data-nx-incident-dot={payload.index} cx={x} cy={yScale(payload.floor + 1.5 + unit)} r={2.2} />)}</g>
    <g opacity={0.8} fill="var(--nx-ink)">
      {payload.count > 0 && <circle data-nx-stack-top={payload.index} cx={x} cy={y} r={4.6} />}
      <text data-nx-total={payload.index} x={x} y={y - 9.6} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fontSize="calc(var(--nx-type-plotValue-size) * 9 / 17)" fontWeight="var(--nx-type-cardTitle-weight)">{payload.incidents ?? '—'}</text>
    </g>
  </g>;
}
function SlopingFloor({ rows }: { rows: readonly CausePoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <Curve data-nx-floor points={rows.map(row => ({ x: xScale(row.index, { position: 'middle' }) ?? 0, y: yScale(row.floor) ?? 0 }))} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="2 4" pointerEvents="none" />;
}

/** Cause observations own rounded-up two-incident stacks above the original sloping baseline. */
export function DotCascade({ data, height, width, animate = true, className = '', 'aria-label': label = 'Incidents by root cause' }: DotCascadeProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): CausePoint => {
    const incidents = row.incidents !== null && Number.isSafeInteger(row.incidents) && row.incidents >= 0 ? row.incidents : null;
    const count = Math.ceil((incidents ?? 0) / 2); const floor = -index * 0.85;
    return { cause: row.cause, incidents, index, floor, count, top: floor + 1.5 + Math.max(0, count - 1) };
  }), [data]);
  const available = rows.some(row => row.incidents !== null);
  const bottom = Math.min(0, ...rows.map(row => row.floor)) - 1; const top = Math.max(0, ...rows.map(row => row.top)) + 2.5;
  return <div ref={ref} className={`nx-dot-cascade flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="dot-cascade" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No incident counts available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="A dot represents up to two incidents, rounding the final dot upward; labels show exact counts. The dotted line is each cause's baseline. Use the left and right arrow keys to inspect causes."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 24, bottom: 0, left: 20, right: 20 }}>
          <XAxis dataKey="index" type="category" scale="band" height={62} interval={0} axisLine={false} tickLine={false} tickSize={0} tickMargin={10}
            tick={({ x, y, payload }) => <text data-nx-cause={payload.value} transform={`translate(${x} ${y}) rotate(-90)`} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 6.5 / 8)" fontWeight="var(--nx-type-axis-weight)">{rows[payload.value]?.cause ?? ''}</text>} />
          <YAxis dataKey="top" type="number" hide domain={[bottom, top]} />
          <SlopingFloor rows={rows} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as CausePoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.cause} — {row.incidents === null ? 'Unavailable' : `${row.incidents} incidents`}</div> : null;
          }} />
          <Scatter id={`${id}-causes`} data={rows} name="Incident causes" fill="var(--nx-ink)" shape={IncidentStack} activeShape={IncidentStack} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE DOT = 2 INCIDENTS · FILLED DOT TOPS EACH STACK</div>
    </div>}
  </div>;
}
