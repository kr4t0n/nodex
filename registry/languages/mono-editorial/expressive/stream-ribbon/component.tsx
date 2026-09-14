'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, usePlotArea } from 'recharts';
import { constrainedCurve } from '../../../../_shared/constrained-curve';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export type StreamRibbonTone = 'ink' | 'strong' | 'muted' | 'quiet' | 'faint';
export interface StreamRibbonDatum { name: string; weekly: readonly (number | null)[]; tone: StreamRibbonTone }
export interface StreamRibbonProps {
  data: readonly StreamRibbonDatum[];
  weeks: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Surface { name: string; tone: StreamRibbonTone; fill: string; index: number; labelWeek: number }
interface WeekPoint { index: number; label: string; values: readonly (number | null)[]; stack: readonly (number | null)[]; total: number | null }
const paints: Record<StreamRibbonTone, string> = { ink: 'var(--nx-ink)', strong: 'var(--nx-markStrong)', muted: 'var(--nx-muted)', quiet: 'var(--nx-markQuiet)', faint: 'var(--nx-faint)' };
const smooth = constrainedCurve(0.5);
function SurfaceLabels({ surfaces, weekCount }: { surfaces: readonly Surface[]; weekCount: number }) {
  const plot = usePlotArea(); if (!plot) return null; const width = plot.width + 58; const height = plot.height + 72;
  // The old graphic labels sit behind the stacked bands; preserve that paint order.
  return <g pointerEvents="none" aria-hidden="true">{surfaces.map(surface => <text key={surface.index} data-nx-surface-label={surface.index} x={(8 + surface.labelWeek / weekCount * 78) / 100 * width} y={(30 + surface.index * 18) / 100 * height} dominantBaseline="hanging" fill={surface.tone === 'ink' || surface.tone === 'strong' ? 'var(--nx-paper)' : 'var(--nx-markStrong)'} fontSize="var(--nx-type-legend-size)" fontWeight="var(--nx-type-pageTitle-weight)">{surface.name}</text>)}</g>;
}

/** Native stacked Areas preserve the old renderer's ordinary zero-based stack and knockout edges. */
export function StreamRibbon({ data, weeks, height, width, animate = true, className = '', 'aria-label': label = 'Weekly active accounts by surface' }: StreamRibbonProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const layout = useMemo(() => {
    const surfaces: Surface[] = data.map((surface, index) => {
      let labelWeek = Math.min(4, Math.max(0, weeks.length - 1));
      surface.weekly.forEach((value, week) => { if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && week >= 4 && week <= weeks.length - 6 && value > (surface.weekly[labelWeek] ?? -1)) labelWeek = week; });
      return { name: surface.name, tone: surface.tone, fill: paints[surface.tone] ?? 'var(--nx-muted)', index, labelWeek };
    });
    const rows: WeekPoint[] = weeks.map((label, index) => {
      const values = data.map(surface => { const value = surface.weekly[index]; return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; });
      const complete = values.length > 0 && values.every((value): value is number => value !== null); const total = complete ? values.reduce((sum, value) => sum + value, 0) : null;
      const available = total !== null && Number.isFinite(total);
      return { index, label, values, stack: available ? values : data.map(() => null), total: available ? total : null };
    });
    return { surfaces, rows, available: rows.some(row => row.total !== null), maximum: Math.max(0, ...rows.map(row => row.total ?? 0)) };
  }, [data, weeks]);
  return <div ref={ref} className={`nx-stream-ribbon flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="stream-ribbon" data-nx-animated={motion.isAnimationActive}>
    {!layout.available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete weekly account readings available.</div> : <div className={height === undefined ? 'aspect-[780/300] min-h-[240px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 208 }}>
        <AreaChart data={layout.rows} accessibilityLayer title={label} desc="Band thickness shows weekly active accounts; total height shows the combined count above zero. A floor tick labels every eighth week. A missing measure leaves a gap in all bands. Use the left and right arrow keys to inspect weeks."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 26, bottom: 0, left: 34, right: 24 }}>
          <XAxis dataKey="index" type="category" scale="point" height={46} interval={0} ticks={layout.rows.filter(row => row.index % 8 === 0).map(row => row.index)} axisLine={false} tickLine={{ stroke: 'var(--nx-faint)', strokeWidth: 'calc(var(--nx-stroke-mark) * 0.6)' }} tickSize={4} tickMargin={4}
            tick={props => { const { x, y, payload } = props; return payload.value % 8 === 0 ? <text data-nx-week-label={payload.value} x={x} y={y} textAnchor="middle" dominantBaseline="hanging" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 7 / 8)" fontWeight="var(--nx-type-axis-weight)">{weeks[payload.value]}</text> : <g />; }} />
          <YAxis type="number" hide domain={layout.maximum === 0 ? [0, 1] : [0, 'auto']} tickCount={7} niceTicks="snap125" />
          <SurfaceLabels surfaces={layout.surfaces} weekCount={weeks.length} />
          <Tooltip filterNull={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'calc(var(--nx-stroke-mark) * 0.8)' }} isAnimationActive={false} content={({ active, label: index }) => { const row = typeof index === 'number' ? layout.rows[index] : undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.label} — {layout.surfaces.map((surface, index) => `${surface.name}: ${row.values[index] === null ? 'Unavailable' : Number(row.values[index]?.toFixed(2))}`).join(' · ')}{row.total === null ? ' · Total unavailable' : ` · Total: ${Number(row.total.toFixed(2))}`}</div> : null;
          }} />
          {layout.surfaces.map(surface => <Area key={surface.index} id={`${id}-surface-${surface.index}`} dataKey={`stack.${surface.index}`} name={surface.name} stackId={`${id}-accounts`} type={smooth} baseValue={0} connectNulls={false} dot={false} activeDot={false} fill={surface.fill} fillOpacity={1} stroke="var(--nx-bg)" strokeWidth={2} zIndex={layout.surfaces.length - surface.index} {...motion} />)}
        </AreaChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
