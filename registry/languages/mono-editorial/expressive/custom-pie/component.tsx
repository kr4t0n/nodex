'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, usePlotArea, type PieLabelRenderProps, type PieSectorShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface CustomPieDatum { surface: string; sharePct: number | null; minutes: number | null }
export interface CustomPieProps {
  data: readonly CustomPieDatum[];
  scaleMinutes: number;
  referenceMinutes: readonly number[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface SurfacePoint extends CustomPieDatum { index: number; fill: string }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
function EngagementWedge(props: PieSectorShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = props; const row = props.payload as SurfacePoint;
  return <g data-nx-observation={row.index}>{row.minutes !== null && row.minutes > 0 && row.sharePct !== null && row.sharePct > 0 && <Sector data-nx-wedge={row.index} data-nx-radius={outerRadius} data-nx-start={startAngle} data-nx-end={endAngle}
    cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} cornerRadius={5}
    fill={row.fill} stroke="var(--nx-bg)" strokeWidth={3} />}</g>;
}
function SurfaceLabel(props: PieLabelRenderProps) {
  const { cx, cy, innerRadius, startAngle, endAngle } = props; const row = props.payload as SurfacePoint;
  const radius = innerRadius / 0.24 + 14; const angle = -(startAngle + endAngle) / 2 * Math.PI / 180; const cos = Math.cos(angle);
  return <text data-nx-surface-label={row.index} x={cx + cos * radius} y={cy + Math.sin(angle) * radius} textAnchor={Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end'} dominantBaseline="central"
    fill="var(--nx-onPaleMark)" fontSize="calc(var(--nx-type-legend-size) * 10 / 9)" fontWeight="var(--nx-type-legend-weight)" pointerEvents="none">{row.surface}  {row.sharePct}% · {row.minutes === null ? '—' : `${row.minutes}m`}</text>;
}
function EngagementPlot({ rows, ceiling, rings, id, motion }: { rows: readonly SurfacePoint[]; ceiling: number; rings: readonly number[]; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }) {
  const plot = usePlotArea(); if (!plot) return null;
  const cx = plot.x + plot.width / 2; const cy = plot.y + plot.height / 2 + 6; const radius = Math.min(plot.width, plot.height) * 0.37; const inner = radius * 0.24;
  const radiusAt = (minutes: number) => inner + (radius - inner) * minutes / ceiling;
  return <>
    <g pointerEvents="none" aria-hidden="true">{rings.map(minutes => <circle key={minutes} data-nx-reference-ring={minutes} cx={cx} cy={cy} r={radiusAt(minutes)} fill="none" stroke="var(--nx-plotFaint)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="3 4" />)}</g>
    <Pie id={`${id}-surfaces`} data={rows} dataKey="sharePct" nameKey="surface" cx={cx} cy={cy} innerRadius={inner} outerRadius={(row: SurfacePoint) => radiusAt(row.minutes ?? 0)} startAngle={90} endAngle={-270} minAngle={0} paddingAngle={0}
      shape={EngagementWedge} label={SurfaceLabel} labelLine={false} rootTabIndex={-1} fill="var(--nx-ink)" stroke="none" animationBegin={0} {...motion} />
  </>;
}

/** Pie angles encode user share; each sector's independent radius encodes daily minutes. */
export function CustomPie({ data, scaleMinutes, referenceMinutes, height, width, animate = true, className = '', 'aria-label': label = 'User share and daily engagement by surface' }: CustomPieProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => {
    const values = data.map((row, index) => ({ surface: row.surface, index,
      sharePct: row.sharePct !== null && Number.isFinite(row.sharePct) && row.sharePct >= 0 && row.sharePct <= 100 ? row.sharePct : null,
      minutes: row.minutes !== null && Number.isFinite(row.minutes) && row.minutes >= 0 ? row.minutes : null }));
    const ranked = values.flatMap(row => row.minutes === null ? [] : [row.minutes]).sort((a, b) => b - a);
    return values.map((row): SurfacePoint => ({ ...row, fill: row.minutes === null ? 'var(--nx-faint)' : tones[Math.min(tones.length - 1, ranked.indexOf(row.minutes))]! })).sort((a, b) => (b.sharePct ?? -1) - (a.sharePct ?? -1));
  }, [data]);
  const available = Number.isFinite(scaleMinutes) && scaleMinutes > 0 && rows.every(row => row.sharePct !== null) && Math.abs(rows.reduce((sum, row) => sum + (row.sharePct ?? 0), 0) - 100) < 1e-6 && rows.some(row => row.minutes !== null);
  const ceiling = Math.max(scaleMinutes, ...rows.map(row => row.minutes ?? 0));
  const rings = [...new Set(referenceMinutes.filter(value => Number.isFinite(value) && value > 0 && value <= ceiling))].sort((a, b) => a - b);
  return <div ref={ref} className={`nx-custom-pie flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="custom-pie" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete user allocation or engagement readings available.</div> : <div className={height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <PieChart accessibilityLayer title={label} desc="Wedge angle shows percent of users, radius shows minutes per day, and darker tone ranks longer stays. Dashed rings are caller reference minutes. Use the left and right arrow keys to inspect surfaces."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as SurfacePoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.surface} — {row.sharePct}% of users · {row.minutes === null ? 'Unavailable' : `${row.minutes} min/day`}</div> : null;
          }} />
          <EngagementPlot rows={rows} ceiling={ceiling} rings={rings} id={id} motion={motion} />
        </PieChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
