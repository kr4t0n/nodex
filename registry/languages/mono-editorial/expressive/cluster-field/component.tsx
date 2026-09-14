'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ClusterFieldDatum { name: string; x: number; y: number; people: number | null; connectedToCore: boolean }
export interface ClusterFieldProps {
  data: readonly ClusterFieldDatum[];
  coreContributors: number | null;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Island extends ClusterFieldDatum { index: number }
interface PersonPoint { kind: 'core' | 'islander'; id: string; x: number; y: number; radius: number; island: Island | null }
interface IslandPoint { kind: 'label'; id: string; x: number; y: number; island: Island }
type FieldPoint = PersonPoint | IslandPoint;
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
function at(x: number, y: number, radius: number, degrees: number) { const angle = degrees * Math.PI / 180; return { x: x + radius * Math.cos(angle), y: y + radius * Math.sin(angle) }; }
const count = (value: number | null) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
function ContributorMark(props: unknown) {
  const { payload, cx, cy, isAnimating, animationElapsedTime } = props as { payload?: FieldPoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number };
  if (!payload || cx === undefined || cy === undefined) return <g />;
  const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  if (payload.kind === 'label') return <g data-nx-observation={payload.id} opacity={0.8}><text data-nx-island-label={payload.island.index} x={cx} y={cy + 26} dominantBaseline="hanging" textAnchor="middle" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{payload.island.name} {payload.island.people ?? '—'}</text></g>;
  return <g data-nx-observation={payload.id}><circle data-nx-contributor={payload.id} data-nx-membership={payload.kind} cx={cx} cy={cy} r={payload.radius * progress} fill={payload.kind === 'core' ? 'var(--nx-ink)' : 'var(--nx-muted)'} opacity={payload.kind === 'core' ? 0.85 : 0.8} /></g>;
}
function FieldGuides({ core, islands }: { core: readonly PersonPoint[]; islands: readonly Island[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const point = (value: { x: number; y: number }) => ({ x: xScale(value.x) ?? 0, y: yScale(value.y) ?? 0 }); const origin = point({ x: 0, y: 0 });
  return <g pointerEvents="none" aria-hidden="true">
    {core.map(person => <Curve key={person.id} data-nx-core-spoke={person.id} points={[origin, point(person)]} type="linear" fill="none" stroke="var(--nx-faint)" strokeWidth="calc(var(--nx-stroke-mark) * 0.6)" />)}
    {islands.filter(island => island.connectedToCore && island.people !== null && island.people > 0 && core.length > 0).map(island => <Curve key={island.index} data-nx-contribution-bridge={island.index} points={Array.from({ length: 19 }, (_, index) => { const t = index / 18; return point({ x: t * island.x, y: 2 * (1 - t) * t * (island.y / 2 + 42) + t * t * island.y }); })} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-mark) * 0.9)" strokeDasharray="2 4" />)}
  </g>;
}

/** Actual contributor observations occupy deterministic golden-angle layouts, one dot per person. */
export function ClusterField({ data, coreContributors, height, width, animate = true, className = '', 'aria-label': label = 'Core and satellite contributors' }: ClusterFieldProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const layout = useMemo(() => {
    const coreCount = count(coreContributors);
    const core: PersonPoint[] = Array.from({ length: coreCount ?? 0 }, (_, index) => ({ kind: 'core', id: `core-${index}`, ...at(0, 0, 28 + random(index + 1, 7) * 88, index * 137.508), radius: (3.2 + random(index + 1, 4) * 3.6) / 2, island: null }));
    const islands: Island[] = data.map((row, index) => ({ ...row, index, people: count(row.people) })).filter(row => Number.isFinite(row.x) && Number.isFinite(row.y));
    const islanders: PersonPoint[] = islands.flatMap(island => Array.from({ length: island.people ?? 0 }, (_, index) => ({ kind: 'islander', id: `island-${island.index}-${index}`, ...at(island.x, island.y, 8 + random(index + 1, island.index + 3) * 30, index * 137.508 + island.index * 40), radius: (2.4 + random(index + 2, island.index + 5) * 2.4) / 2, island })));
    const labels: IslandPoint[] = islands.map(island => ({ kind: 'label', id: `label-${island.index}`, x: island.x, y: island.y, island }));
    return { coreCount, core, islands, rows: [...core, ...islanders, ...labels], available: coreCount !== null || islands.some(island => island.people !== null) };
  }, [data, coreContributors]);
  const xDomain: [number, number] = [Math.min(-280, ...layout.islands.map(island => island.x - 40)), Math.max(560, ...layout.islands.map(island => island.x + 40))];
  const yDomain: [number, number] = [Math.min(-170, ...layout.islands.map(island => island.y - 40)), Math.max(200, ...layout.islands.map(island => island.y + 40))];
  return <div ref={ref} className={`nx-cluster-field flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="cluster-field" data-nx-animated={motion.isAnimationActive}>
    {!layout.available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No contributor counts available.</div> : <div className={height === undefined ? 'relative aspect-[720/320] min-h-[256px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 240 }}>
        <ScatterChart accessibilityLayer title={label} desc={`${layout.coreCount ?? 'Unavailable'} core contributors. One dot is one contributor; spokes show core membership and dotted bridges are caller-declared cross-contribution. Position is layout, not a metric. Use the left and right arrow keys to inspect contributors and islands.`}
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 16, bottom: 34, left: 16, right: 16 }}>
          <XAxis dataKey="x" type="number" hide domain={xDomain} />
          <YAxis dataKey="y" type="number" hide domain={yDomain} />
          <FieldGuides core={layout.core} islands={layout.islands} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as FieldPoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.kind === 'label' ? `${row.island.name} — ${row.island.people === null ? 'Unavailable' : `${row.island.people} contributors`}` : row.kind === 'core' ? 'a core contributor' : `an island contributor · ${row.island?.name}`}</div> : null;
          }} />
          <Scatter id={`${id}-contributors`} data={layout.rows} name="Contributors and islands" fill="var(--nx-ink)" shape={ContributorMark} activeShape={ContributorMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-muted)]">ONE DOT = ONE CONTRIBUTOR · DOTTED ARC = WORKS ON BOTH</div>
    </div>}
  </div>;
}
