'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, useActiveTooltipDataPoints, useIsTooltipActive, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { ringAngles, quadraticChord } from '../../../../_shared/circular-layout';

export interface CircularGraphDenseDatum { repository: string; organizationIndex: number; contributors: number | null }
export interface CircularGraphDenseTie { source: number; target: number; shared: number | null }
export interface CircularGraphDenseProps {
  data: readonly CircularGraphDenseDatum[];
  ties: readonly CircularGraphDenseTie[];
  organizations: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Position { x: number; y: number }
interface RepoNode extends Position { kind: 'node'; index: number; repository: string; organizationIndex: number; organization: string | null; angle: number; contributors: number | null; diameter: number; areaValue: number; connected: readonly number[] }
interface RepoEdge extends Position { kind: 'edge'; index: number; source: RepoNode; target: RepoNode; shared: number | null; sameOrganization: boolean; areaValue: number }
type Observation = RepoNode | RepoEdge;
const available = (value: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
function GraphMark(props: unknown) {
  const { payload: row, cx, cy, size, isAnimating, animationElapsedTime } = props as { payload?: Observation; cx?: number; cy?: number; size?: number; isAnimating?: boolean; animationElapsedTime?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const active = useIsTooltipActive(); const focus = useActiveTooltipDataPoints<Observation>()?.[0];
  if (!row || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  const related = !active || !focus || (row.kind === 'edge' ? focus.kind === 'edge' ? row.index === focus.index : row.source.index === focus.index || row.target.index === focus.index : focus.kind === 'edge' ? row.index === focus.source.index || row.index === focus.target.index : row.index === focus.index || focus.connected.includes(row.index));
  if (row.kind === 'edge') {
    if (row.shared === null) return <g data-nx-unpainted-tie={row.index} />;
    const point = (p: Position) => ({ x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 });
    const control = { x: (row.source.x + row.target.x) / 2 * 0.1, y: (row.source.y + row.target.y) / 2 * 0.1 };
    return <Curve data-nx-tie={row.index} data-nx-related={related} points={[point(row.source), point(control), point(row.target)]} type={quadraticChord} fill="none" stroke={active && related ? 'var(--nx-ink)' : row.sameOrganization ? 'var(--nx-markPale)' : 'var(--nx-grid)'} strokeWidth={active && related ? 'calc(var(--nx-stroke-mark) * 1.1)' : 0.4 + row.shared * 0.28} opacity={(active ? related ? 0.9 : 0.03 : row.sameOrganization ? 0.5 : 0.32) * progress} />;
  }
  const radius = Math.sqrt(Math.max(0, size ?? 0) / Math.PI);
  const emphasized = active && related; const left = Math.cos(row.angle) < 0;
  const rotation = row.angle * 180 / Math.PI - (left ? 180 : 0);
  const fill = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)'][row.organizationIndex] ?? 'var(--nx-ink)';
  return <g data-nx-repository={row.index} data-nx-related={related} opacity={related ? 1 : 0.12}>
    {radius > 0 && <circle data-nx-repository-mark={row.index} cx={cx} cy={cy} r={radius} fill={fill} />}
    {((row.contributors ?? -1) >= 26 || emphasized) && <g transform={`translate(${cx} ${cy}) rotate(${rotation})`}><text data-nx-repository-label={row.index} x={(left ? -1 : 1) * (row.diameter / 2 + 4)} y={0} textAnchor={left ? 'end' : 'start'} dominantBaseline="central" fill={emphasized ? 'var(--nx-ink)' : 'var(--nx-markMuted)'} fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)" fontWeight="var(--nx-font-weight-semibold)">{row.repository}</text></g>}
  </g>;
}
function RepoSeries({ data, ties, organizations, id, motion }: { data: readonly CircularGraphDenseDatum[]; ties: readonly CircularGraphDenseTie[]; organizations: readonly string[]; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }) {
  const plot = usePlotArea(); const width = plot?.width ?? 492; const height = plot?.height ?? 338;
  const rows = useMemo(() => {
    const radius = Math.min(width, height) / 2;
    const counts = data.map(row => available(row.contributors)); const diameters = counts.map(count => count === null ? 0 : 3.5 + Math.sqrt(count) * 1.7); const angles = ringAngles(diameters, radius);
    const nodes: RepoNode[] = data.map((row, index) => ({ kind: 'node', index, repository: row.repository, organizationIndex: row.organizationIndex, organization: organizations[row.organizationIndex] ?? null, angle: angles[index]!, contributors: counts[index]!, diameter: diameters[index]!, areaValue: Math.PI * (diameters[index]! / 2) ** 2, x: Math.cos(angles[index]!) * radius / Math.max(1, width / 2), y: -Math.sin(angles[index]!) * radius / Math.max(1, height / 2), connected: [] }));
    const edges: RepoEdge[] = ties.flatMap((tie, index) => {
      if (!Number.isSafeInteger(tie.source) || !Number.isSafeInteger(tie.target)) return [];
      const source = nodes[tie.source]; const target = nodes[tie.target]; if (!source || !target) return [];
      const shared = available(tie.shared);
      if (shared !== null) { source.connected = [...source.connected, target.index]; target.connected = [...target.connected, source.index]; }
      return [{ kind: 'edge', index, source, target, shared, sameOrganization: source.organization !== null && target.organization !== null && source.organizationIndex === target.organizationIndex, areaValue: 0, x: (source.x + target.x) * 0.275, y: (source.y + target.y) * 0.275 }];
    });
    return [...edges, ...nodes];
  }, [data, ties, organizations, width, height]);
  const maximum = Math.max(1, ...rows.map(row => row.areaValue));
  return <><ZAxis dataKey="areaValue" domain={[0, maximum]} range={[0, maximum]} /><Scatter id={`${id}-network`} data={rows} name="Relationships and repositories" shape={GraphMark} activeShape={GraphMark} fill="var(--nx-ink)" {...motion} /></>;
}

/** Native scatter scales and observations own a diameter-aware ring and weighted curve marks. */
export function CircularGraphDense({ data, ties, organizations, height, width, animate = true, className = '', 'aria-label': label = 'Working relationships between repositories' }: CircularGraphDenseProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  return <div ref={ref} className={`nx-circular-graph-dense flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="circular-graph-dense" data-nx-animated={motion.isAnimationActive}>
    {!data.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No repository network available.</div> : <div className={height === undefined ? 'aspect-[560/400] min-h-[320px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 386 }}>
        <ScatterChart accessibilityLayer title={label} desc="Repository diameter is 3.5 plus 1.7 times the square root of contributors; link width is 0.4 plus 0.28 times shared contributors. Zero retains these identity baselines; unknown counts have no mark. Organization controls node tone and within-organization link treatment. Hover or use left/right arrows to inspect relationships then repositories and highlight adjacency."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 24, bottom: 24, left: 24, right: 24 }}>
          <XAxis dataKey="x" type="number" domain={[-1, 1]} hide /><YAxis dataKey="y" type="number" domain={[-1, 1]} hide />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as Observation | undefined; return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.kind === 'node' ? `${row.repository} — ${row.contributors === null ? 'Unavailable' : `${row.contributors} contributors`}` : `${row.source.repository} ↔ ${row.target.repository} — ${row.shared === null ? 'Unavailable' : `${row.shared} shared contributors`}`}</div> : null; }} />
          <RepoSeries data={data} ties={ties} organizations={organizations} id={id} motion={motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
