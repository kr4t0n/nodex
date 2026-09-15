'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface RankStripDatum { name: string; ranks: readonly (number | null)[] }
export interface RankStripProps {
  data: readonly RankStripDatum[];
  periods: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface ProductRow { name: string; ranks: (number | null)[]; index: number; final: number | null }
interface RankPoint { name: string; rank: number; row: number; column: number; id: string }
const rankOf = (rank: number | null | undefined) => rank !== null && rank !== undefined && Number.isSafeInteger(rank) && rank > 0 ? rank : null;
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-heatLow)'];

function RankCell(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: RankPoint };
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (cx === undefined || cy === undefined || !payload || !xScale || !yScale) return <g />;
  const width = Math.abs((xScale(payload.column + 0.5) ?? cx) - (xScale(payload.column - 0.5) ?? cx));
  const height = Math.abs((yScale(payload.row + 0.5) ?? cy) - (yScale(payload.row - 0.5) ?? cy));
  return <g data-nx-observation={payload.id}>
    <rect data-nx-cell={payload.id} x={cx - width / 2} y={cy - height / 2} width={width} height={height} style={{ rx: 'var(--nx-radius-rankCell)' }}
      fill={tones[Math.min(payload.rank - 1, tones.length - 1)]} stroke="var(--nx-cellEdge)" strokeWidth="calc(var(--nx-stroke-hairline) * 5 / 7)" />
    <text data-nx-rank={payload.id} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill={payload.rank <= 2 ? 'var(--nx-paper)' : 'var(--nx-onPaleMark)'}
      fontSize="calc(var(--nx-type-plotValue-size) * 9.5 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{payload.rank}</text>
  </g>;
}

function ProductLabels({ rows }: { rows: readonly ProductRow[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true">{rows.map((row, index) => <text key={row.index} data-nx-product={row.index} x={(xScale(-0.5) ?? 0) - 12} y={yScale(index)} textAnchor="end" dominantBaseline="central"
    fill={index === 0 && row.final !== null ? 'var(--nx-ink)' : 'var(--nx-markMuted)'} fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)" fontWeight="var(--nx-type-axis-weight)">{row.name}</text>)}</g>;
}

/** Rank is absolute tone; each available product-period pair owns its cell and inspection. */
export function RankStrip({ data, periods, height, width, animate = true, className = '', 'aria-label': label = 'Product ranks by period' }: RankStripProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, points } = useMemo(() => {
    const rows: ProductRow[] = data.map((product, index) => ({ name: product.name, ranks: periods.map((_, column) => rankOf(product.ranks[column])), index, final: rankOf(product.ranks[periods.length - 1]) }));
    rows.sort((a, b) => a.final === b.final ? a.index - b.index : a.final === null ? 1 : b.final === null ? -1 : a.final - b.final);
    const points = rows.flatMap((product, row) => product.ranks.flatMap((rank, column): RankPoint[] => rank === null ? [] : [{ name: product.name, rank, row, column, id: `${product.index}:${column}` }]));
    return { rows, points };
  }, [data, periods]);
  return <div ref={ref} className={`nx-rank-strip flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="rank-strip" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No ranks available.</div> : <div className={height === undefined ? 'aspect-[560/300] min-h-[240px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 289 }}>
        <ScatterChart accessibilityLayer title={label} desc="Rows sort by their final-period rank. Darker cells show higher ranks, with the rank printed in each cell. Missing ranks leave gaps. Use the left and right arrow keys to inspect product-period observations."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 0, right: 24, bottom: 24, left: 76 }}>
          <XAxis dataKey="column" type="number" domain={[-0.5, periods.length - 0.5]} orientation="top" height={40} ticks={periods.map((_, index) => index)} interval={0} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tickFormatter={(column: number) => periods[column] ?? ''} tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis dataKey="row" type="number" hide reversed domain={[-0.5, rows.length - 0.5]} />
          <ProductLabels rows={rows} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as RankPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.name} — #{point.rank} in {periods[point.column]}</div> : null;
          }} />
          <Scatter id={`${id}-ranks`} data={points} name="Product ranks" fill="var(--nx-ink)" shape={RankCell} activeShape={RankCell} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
