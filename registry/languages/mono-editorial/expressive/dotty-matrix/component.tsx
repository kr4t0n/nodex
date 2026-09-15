'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DottyMatrixDatum { squad: string; tasks: readonly (readonly (number | null)[])[] }
export interface DottyMatrixProps {
  data: readonly DottyMatrixDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface TaskPoint { x: number; y: number; tasks: number; squad: string; deck: number; row: number; column: number; index: string }
interface Deck { squad: string; index: number; rows: number; columns: number }
const tones = ['var(--nx-faint)', 'var(--nx-markSoft)', 'var(--nx-markMuted)'];
const project = (column: number, row: number, deck: number) => ({ x: (column - row) * 20, y: -(column + row) * 10 + deck * 64 });

function TaskDot(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: TaskPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <g data-nx-observation={payload.index}><circle data-nx-task={payload.index} cx={cx} cy={cy} r={payload.tasks === 0 ? 0.7 : 1 + Math.sqrt(payload.tasks) * 1.15}
    fill={payload.tasks === 0 ? 'var(--nx-plotFaint)' : tones[payload.deck] ?? 'var(--nx-ink)'} opacity={0.8} /></g>;
}

function DeckPlanes({ decks }: { decks: readonly Deck[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g aria-hidden="true" pointerEvents="none">{decks.map((deck) => {
    const corners = [[-0.8, -0.8], [deck.columns - 0.2, -0.8], [deck.columns - 0.2, deck.rows - 0.2], [-0.8, deck.rows - 0.2]];
    const points = corners.map(([column = 0, row = 0]) => project(column, row, deck.index)).map((point) => ({ x: xScale(point.x) ?? 0, y: yScale(point.y) ?? 0 }));
    return <Curve key={deck.index} data-nx-deck={deck.index} type="linearClosed" points={points} fill="var(--nx-bg)" opacity={0.96}
      stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-hairline) * 9 / 7)" />;
  })}</g>;
}

function DeckLabels({ decks }: { decks: readonly Deck[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const area = usePlotArea();
  if (!xScale || !yScale || !area) return null;
  return <g aria-hidden="true" pointerEvents="none" opacity={0.8}>{decks.map((deck) => {
    const point = project(deck.columns - 0.2, -0.8, deck.index);
    const x = xScale(point.x); const y = yScale(point.y);
    // The old label observations were clipped when their corner lay outside the plot.
    if (x === undefined || y === undefined || x < area.x || x > area.x + area.width || y < area.y || y > area.y + area.height) return null;
    return <text key={deck.index} x={x + 20} y={y} dominantBaseline="central" fill="var(--nx-muted)"
      fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{deck.squad}</text>;
  })}</g>;
}

/** Projected deck positions are data coordinates; Recharts owns the scales and observations. */
export function DottyMatrix({ data, height, width, animate = true, className = '', 'aria-label': label = 'Squad task activity on stacked decks' }: DottyMatrixProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, decks } = useMemo(() => ({
    decks: data.map((deck, index): Deck => ({ squad: deck.squad, index, rows: Math.max(1, deck.tasks.length), columns: Math.max(1, ...deck.tasks.map((row) => row.length)) })),
    points: data.flatMap((deck, index) => deck.tasks.flatMap((row, rowIndex) => row.flatMap((tasks, column): TaskPoint[] => tasks !== null && Number.isFinite(tasks) && tasks >= 0
      ? [{ ...project(column, rowIndex, index), tasks, squad: deck.squad, deck: index, row: rowIndex, column, index: `${index}:${rowIndex}:${column}` }] : []))),
  }), [data]);
  const xMin = Math.min(-130, ...decks.map((deck) => deck.rows > 6 ? -(deck.rows + 0.6) * 20 : -130));
  const xMax = Math.max(130, ...decks.map((deck) => deck.columns > 6 ? (deck.columns + 0.6) * 20 : 130));
  const yMin = Math.min(-120, ...decks.map((deck) => -(deck.columns + deck.rows - 0.4) * 10 + deck.index * 64));
  const yMax = Math.max(84, decks.length * 64 + 20);
  return <div ref={ref} className={`nx-dotty-matrix flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="dotty-matrix" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/400] min-h-[320px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 386 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each deck is a squad. Position identifies week and lane; dot size shows tasks. Tiny dots mean zero and missing cells have no mark. Use the left and right arrow keys to inspect observations."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 20, right: 96, bottom: 20, left: 30 }}>
          <XAxis dataKey="x" type="number" hide domain={[xMin, xMax]} />
          <YAxis dataKey="y" type="number" hide domain={[yMin, yMax]} />
          <DeckPlanes decks={decks} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as TaskPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.squad} — {point.tasks} tasks</div> : null;
          }} />
          <Scatter id={`${id}-tasks`} data={points} name="Tasks" fill="var(--nx-ink)" shape={TaskDot} activeShape={TaskDot} {...motion} />
          <DeckLabels decks={decks} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-faint)]">ONE DOT = ONE DAY · DOT AREA = TASKS · TINY DOT = A QUIET DAY</div>
    </div>}
  </div>;
}
