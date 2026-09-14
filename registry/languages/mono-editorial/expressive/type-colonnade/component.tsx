'use client';

import { useId, useMemo } from 'react';
import { Curve, Rectangle, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface TypeColonnadeDatum { repo: string; team: number | null }
export interface TypeColonnadeProps {
  data: readonly TypeColonnadeDatum[];
  teams: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface RepositoryPoint { repo: string; team: number; index: number; x: number; y: number }
const teamY = (team: number) => 18 + team * 28;

function RepositoryMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: RepositoryPoint };
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (cx === undefined || cy === undefined || !payload || !xScale || !yScale) return <g />;
  const points = Array.from({ length: 21 }, (_, index) => {
    const u = index / 20; const v = 1 - u;
    return { x: xScale(3 * v * v * u * 62 + 3 * v * u * u * 72 + u ** 3 * 100) ?? 0,
      y: yScale(v ** 3 * payload.y + 3 * v * v * u * payload.y + 3 * v * u * u * teamY(payload.team) + u ** 3 * teamY(payload.team)) ?? 0 };
  });
  return <g data-nx-observation={payload.index}>
    <Curve data-nx-strand={payload.index} points={points} type="linear" fill="none" stroke="var(--nx-markSoft)" strokeWidth="calc(var(--nx-stroke-hairline) * 6 / 7)" opacity={0.6} pointerEvents="none" />
    <g opacity={0.8}>
      <Rectangle data-nx-repository={payload.index} x={cx - 2} y={cy - 1.2} width={4} height={2.4} fill="var(--nx-markQuiet)" />
      <text x={cx - 6} y={cy} textAnchor="end" dominantBaseline="central" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 5 / 8)" fontWeight="var(--nx-type-subtitle-weight)">{payload.repo}</text>
    </g>
  </g>;
}

function OwnerLabels({ teams, counts }: { teams: readonly string[]; counts: readonly number[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true" opacity={0.8}>{teams.map((team, index) => <text key={index} data-nx-owner={index} x={(xScale(100) ?? 0) + 10} y={yScale(teamY(index))}
    dominantBaseline="central" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{team} {counts[index] ?? 0}</text>)}</g>;
}

/** One strand per repository, with ownership counts derived from the same observations. */
export function TypeColonnade({ data, teams, height, width, animate = true, className = '', 'aria-label': label = 'Repository ownership by team' }: TypeColonnadeProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { points, counts } = useMemo(() => {
    const counts = teams.map(() => 0);
    const points = data.flatMap((entry, index): RepositoryPoint[] => {
      if (entry.team === null || !Number.isSafeInteger(entry.team) || entry.team < 0 || entry.team >= teams.length) return [];
      counts[entry.team] = (counts[entry.team] ?? 0) + 1;
      return [{ repo: entry.repo, team: entry.team, index, x: 0, y: index * 6.7 }];
    });
    return { points, counts };
  }, [data, teams]);
  const bottom = Math.max(teamY(teams.length - 1) + 20, (data.length - 1) * 6.7 + 1.9);
  return <div ref={ref} className={`nx-type-colonnade flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="type-colonnade" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No ownership observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Every strand joins one repository to its owner. Owner labels include the available repository count. Use the left and right arrow keys to inspect repositories."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 16, right: 96, bottom: 16, left: 92 }}>
          <XAxis dataKey="x" type="number" hide domain={[0, 100]} />
          <YAxis dataKey="y" type="number" hide reversed domain={[-12, bottom]} />
          <OwnerLabels teams={teams} counts={counts} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const entry = payload?.[0]?.payload as RepositoryPoint | undefined;
            return active && entry ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{entry.repo}</div> : null;
          }} />
          <Scatter id={`${id}-repositories`} data={points} name="Repositories" fill="var(--nx-markQuiet)" shape={RepositoryMark} activeShape={RepositoryMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markMuted)]">ONE STRAND = ONE REPOSITORY</div>
    </div>}
  </div>;
}
