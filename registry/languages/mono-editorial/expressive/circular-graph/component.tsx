'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, useActiveTooltipDataPoints, useIsTooltipActive, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { ringAngles, quadraticChord } from '../../../../_shared/circular-layout';

export interface CircularGraphDatum { team: string; headcount: number | null }
export interface CircularGraphTie { source: number; target: number; weeklyThreads: number | null }
export interface CircularGraphProps {
  data: readonly CircularGraphDatum[];
  ties: readonly CircularGraphTie[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Position { x: number; y: number }
interface TeamNode extends Position { kind: 'node'; index: number; team: string; headcount: number | null; diameter: number; areaValue: number; connected: readonly number[] }
interface TeamEdge extends Position { kind: 'edge'; index: number; source: TeamNode; target: TeamNode; weeklyThreads: number | null; areaValue: number }
type Observation = TeamNode | TeamEdge;
const available = (value: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
function GraphMark(props: unknown) {
  const { payload: row, cx, cy, size, isAnimating, animationElapsedTime } = props as { payload?: Observation; cx?: number; cy?: number; size?: number; isAnimating?: boolean; animationElapsedTime?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const active = useIsTooltipActive(); const focus = useActiveTooltipDataPoints<Observation>()?.[0];
  if (!row || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  const related = !active || !focus || (row.kind === 'edge' ? focus.kind === 'edge' ? row.index === focus.index : row.source.index === focus.index || row.target.index === focus.index : focus.kind === 'edge' ? row.index === focus.source.index || row.index === focus.target.index : row.index === focus.index || focus.connected.includes(row.index));
  if (row.kind === 'edge') {
    if (row.weeklyThreads === null || row.weeklyThreads === 0) return <g data-nx-unpainted-tie={row.index} />;
    const point = (p: Position) => ({ x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 });
    const control = { x: (row.source.x + row.target.x) / 2 * 0.16, y: (row.source.y + row.target.y) / 2 * 0.16 };
    return <Curve data-nx-tie={row.index} data-nx-related={related} points={[point(row.source), point(control), point(row.target)]} type={quadraticChord} fill="none" stroke={active && related ? 'var(--nx-ink)' : 'var(--nx-markQuiet)'} strokeWidth={row.weeklyThreads * 0.7} opacity={(active ? related ? 0.8 : 0.055 : 0.55) * progress} />;
  }
  const radius = Math.sqrt(Math.max(0, size ?? 0) / Math.PI);
  return <g data-nx-team={row.index} data-nx-related={related} opacity={related ? 1 : 0.1}>
    {radius > 0 && <circle data-nx-team-mark={row.index} cx={cx} cy={cy} r={radius} fill={row.index < 4 ? 'var(--nx-ink)' : row.index < 8 ? 'var(--nx-muted)' : 'var(--nx-markQuiet)'} />}
    <text data-nx-team-label={row.index} x={cx + row.diameter / 2 + 7} y={cy} dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 9.5 / 8)" fontWeight="var(--nx-font-weight-semibold)">{row.team}</text>
  </g>;
}
function TeamSeries({ data, ties, id, motion }: { data: readonly CircularGraphDatum[]; ties: readonly CircularGraphTie[]; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }) {
  const plot = usePlotArea(); const width = plot?.width ?? 436; const height = plot?.height ?? 279;
  const rows = useMemo(() => {
    const radius = Math.min(width, height) / 2;
    const counts = data.map(row => available(row.headcount)); const diameters = counts.map(count => (count ?? 0) * 0.62); const angles = ringAngles(diameters, radius);
    const nodes: TeamNode[] = data.map((row, index) => ({ kind: 'node', index, team: row.team, headcount: counts[index]!, diameter: diameters[index]!, areaValue: Math.PI * (diameters[index]! / 2) ** 2, x: Math.cos(angles[index]!) * radius / Math.max(1, width / 2), y: -Math.sin(angles[index]!) * radius / Math.max(1, height / 2), connected: [] }));
    const edges: TeamEdge[] = ties.flatMap((tie, index) => {
      if (!Number.isSafeInteger(tie.source) || !Number.isSafeInteger(tie.target)) return [];
      const source = nodes[tie.source]; const target = nodes[tie.target]; if (!source || !target) return [];
      const weeklyThreads = available(tie.weeklyThreads);
      if (weeklyThreads !== null && weeklyThreads > 0) { source.connected = [...source.connected, target.index]; target.connected = [...target.connected, source.index]; }
      return [{ kind: 'edge', index, source, target, weeklyThreads, areaValue: 0, x: (source.x + target.x) * 0.29, y: (source.y + target.y) * 0.29 }];
    });
    return [...edges, ...nodes];
  }, [data, ties, width, height]);
  const maximum = Math.max(1, ...rows.map(row => row.areaValue));
  return <><ZAxis dataKey="areaValue" domain={[0, maximum]} range={[0, maximum]} /><Scatter id={`${id}-network`} data={rows} name="Relationships and teams" shape={GraphMark} activeShape={GraphMark} fill="var(--nx-ink)" {...motion} /></>;
}

/** Native scatter scales and observations own a diameter-aware ring and weighted curve marks. */
export function CircularGraph({ data, ties, height, width, animate = true, className = '', 'aria-label': label = 'Working relationships between teams' }: CircularGraphProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  return <div ref={ref} className={`nx-circular-graph flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="circular-graph" data-nx-animated={motion.isAnimationActive}>
    {!data.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No team network available.</div> : <div className={height === undefined ? 'aspect-[560/360] min-h-[288px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 347 }}>
        <ScatterChart accessibilityLayer title={label} desc="Node diameter shows headcount; link width shows weekly threads. Teams retain caller order and diameter-aware spacing around a circle. Hover or use left/right arrows to inspect relationships followed by teams; inspection highlights adjacency. Unknown counts have no mark."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 34, bottom: 34, left: 52, right: 52 }}>
          <XAxis dataKey="x" type="number" domain={[-1, 1]} hide /><YAxis dataKey="y" type="number" domain={[-1, 1]} hide />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as Observation | undefined; return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.kind === 'node' ? `${row.team} — ${row.headcount === null ? 'Unavailable' : `${row.headcount} people`}` : `${row.source.team} ↔ ${row.target.team} — ${row.weeklyThreads === null ? 'Unavailable' : `${row.weeklyThreads} weekly threads`}`}</div> : null; }} />
          <TeamSeries data={data} ties={ties} id={id} motion={motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
