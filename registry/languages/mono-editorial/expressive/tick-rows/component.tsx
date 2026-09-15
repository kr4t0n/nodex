'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, Curve, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { TallyMarks } from '../../../../_shared/tally-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface TickRowsDatum { team: string; releases: number | null }
export interface TickRowsProps {
  data: readonly TickRowsDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface TeamRow extends TickRowsDatum { index: number }

function ReleaseTicks({ payload }: BarShapeProps) {
  const point = payload as TeamRow;
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const y = yScale?.(point.index, { position: 'middle' });
  if (!xScale || y === undefined || point.releases === null) return <g />;
  return <g data-nx-observation={point.index}>
    <TallyMarks to={point.releases} offset={1} x={xScale} y={y} length={[9, 6]} lengthSeed={point.index + 2} opacity={[0.55, 0.45]} opacitySeed={point.index + 5} opacityOffset={3}
      thickness="calc(var(--nx-stroke-mark) * 0.9)" fill="var(--nx-ink)" series="releases" />
    {Array.from({ length: Math.floor(point.releases / 5) }, (_, index) => <circle key={index} data-nx-counting-dot={(index + 1) * 5 - 1} cx={xScale((index + 1) * 5)} cy={y + 11} r={0.8} fill="var(--nx-faint)" opacity={0.8} pointerEvents="none" />)}
  </g>;
}

function RowRules({ rows, ceiling }: { rows: readonly TeamRow[]; ceiling: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true">{rows.map((row) => {
    const y = yScale(row.index, { position: 'end' }) ?? 0;
    return <Curve key={row.index} points={[{ x: xScale(0) ?? 0, y }, { x: xScale(ceiling) ?? 0, y }]} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-hairline) * 6 / 7)" />;
  })}</g>;
}

function ReleaseTotal({ value, rows }: LabelProps & { rows: readonly TeamRow[] }) {
  const row = typeof value === 'number' ? rows[value] : undefined;
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!row || !xScale || !yScale) return <g />;
  return <text data-nx-total={row.index} x={(xScale((row.releases ?? 0) + 1) ?? 0) + 4} y={yScale(row.index, { position: 'middle' })} dominantBaseline="central" fill="var(--nx-ink)" opacity={0.8}
    fontSize="calc(var(--nx-type-plotValue-size) * 11 / 17)" fontWeight="var(--nx-type-pageTitle-weight)" pointerEvents="none">{row.releases ?? '—'}</text>;
}

/** The Bar series owns teams and scales; its custom marks are individual releases. */
export function TickRows({ data, height, width, animate = true, className = '', 'aria-label': label = 'Release counts by team' }: TickRowsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): TeamRow => ({ team: row.team, releases: row.releases !== null && Number.isSafeInteger(row.releases) && row.releases >= 0 ? row.releases : null, index })), [data]);
  const available = rows.some((row) => row.releases !== null);
  const ceiling = Math.max(0, ...rows.map((row) => row.releases ?? 0)) + 2;
  return <div ref={ref} className={`nx-tick-rows flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="tick-rows" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No release counts available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart layout="vertical" data={rows} accessibilityLayer title={label} desc="One tick is one release; a dot marks every fifth tick. Use ArrowLeft to advance to the next team and ArrowRight to return."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 22, right: 46, bottom: 46, left: 0 }}>
          <XAxis type="number" hide domain={[0, ceiling]} />
          <YAxis dataKey="index" type="category" scale="band" width={84} interval={0} axisLine={false} tickLine={false} tickSize={0} tickMargin={12}
            tick={({ x, y, payload }) => <text x={x} y={y} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-cardTitle-weight)">{rows[payload.value]?.team ?? ''}</text>} />
          <RowRules rows={rows} ceiling={ceiling} />
          {rows.filter((row) => row.releases === null).map((row) => <ReleaseTotal key={row.index} value={row.index} rows={rows} />)}
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const row = typeof index === 'number' ? rows[index] : undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.team} — {row.releases === null ? 'Unavailable' : `${row.releases} releases`}</div> : null;
          }} />
          <Bar id={`${id}-releases`} dataKey="releases" name="Releases" fill="var(--nx-ink)" stroke="none" shape={ReleaseTicks} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<ReleaseTotal rows={rows} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE TICK = ONE RELEASE · DOT MARKS EVERY FIFTH</div>
    </div>}
  </div>;
}
