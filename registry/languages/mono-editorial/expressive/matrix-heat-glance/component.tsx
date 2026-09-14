'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface MatrixHeatGlanceDatum { release: string; adoption: readonly (number | null)[] }
export interface MatrixHeatGlanceProps {
  features: readonly string[];
  data: readonly MatrixHeatGlanceDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface AdoptionPoint { row: number; column: number; value: number; index: string; band: number }
const tones = ['var(--nx-heatLow)', 'var(--nx-markQuiet)', 'var(--nx-muted)', 'var(--nx-markStrong)', 'var(--nx-ink)'];
const bandOf = (value: number) => value <= 15 ? 0 : value <= 30 ? 1 : value <= 46 ? 2 : value <= 64 ? 3 : 4;

function AdoptionCell(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: AdoptionPoint };
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (cx === undefined || cy === undefined || !payload || !xScale || !yScale) return <g />;
  const cellWidth = Math.abs((xScale(payload.column + 0.5) ?? cx) - (xScale(payload.column - 0.5) ?? cx));
  const cellHeight = Math.abs((yScale(payload.row + 0.5) ?? cy) - (yScale(payload.row - 0.5) ?? cy));
  return <g data-nx-observation={payload.index}>
    <rect data-nx-cell={payload.index} x={cx - cellWidth / 2} y={cy - cellHeight / 2} width={cellWidth} height={cellHeight}
      style={{ rx: 'var(--nx-radius-heatCellLarge)' }} fill={tones[payload.band]} stroke="var(--nx-bg)" strokeWidth={3} />
    <text data-nx-value={payload.index} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill={payload.value > 46 ? 'var(--nx-paper)' : 'var(--nx-ink)'}
      fontSize="calc(var(--nx-type-plotValue-size) * 10.5 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{payload.value}</text>
  </g>;
}

/** Each release keeps its own row, with absolute adoption bands and readable values. */
export function MatrixHeatGlance({ features, data, height, width, animate = true, className = '', 'aria-label': label = 'Feature adoption by release' }: MatrixHeatGlanceProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.flatMap((row, rowIndex) => row.adoption.flatMap((value, column): AdoptionPoint[] => column < features.length && value !== null && Number.isFinite(value) && value >= 0 && value <= 100
    ? [{ row: rowIndex, column, value, index: `${rowIndex}:${column}`, band: bandOf(value) }] : [])), [data, features.length]);
  return <div ref={ref} className={`nx-matrix-heat-glance flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="matrix-heat-glance" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Rows are releases; columns are features. Fixed shades and numbers show adoption percentages. Missing observations have no cell. Use the left and right arrow keys to inspect each observation."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 0, right: 18, bottom: 44, left: 0 }}>
          <XAxis dataKey="column" type="number" domain={[-0.5, features.length - 0.5]} orientation="top" height={40} ticks={features.map((_, index) => index)} interval={0}
            tickFormatter={(column: number) => features[column] ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 6.5 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <YAxis dataKey="row" type="number" domain={[-0.5, data.length - 0.5]} reversed width={60} ticks={data.map((_, index) => index)} interval={0}
            tickFormatter={(row: number) => data[row]?.release ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-markMuted)', fontSize: 'calc(var(--nx-type-axis-size) * 8.5 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as AdoptionPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{features[point.column]} on {data[point.row]?.release} — {point.value}% of accounts</div> : null;
          }} />
          <Scatter id={`${id}-adoption`} data={points} name="Adoption" fill="var(--nx-ink)" shape={<AdoptionCell />} activeShape={<AdoptionCell />} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">SHARE OF ACCOUNTS USING EACH FEATURE, BY RELEASE</div>
    </div>}
  </div>;
}
