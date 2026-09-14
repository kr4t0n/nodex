'use client';

import { useId, useMemo, useState } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface MatrixHeatProps {
  features: readonly string[];
  data: readonly (readonly (number | null)[])[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface PairPoint { row: number; column: number; value: number; index: string; band: number; peak: boolean }
const tones = ['var(--nx-heatLow)', 'var(--nx-markQuiet)', 'var(--nx-muted)', 'var(--nx-markStrong)', 'var(--nx-ink)'];
const bandLabels = ['1–6', '7–14', '15–24', '25–36', '37+'];
const bandOf = (value: number) => value <= 6 ? 0 : value <= 14 ? 1 : value <= 24 ? 2 : value <= 36 ? 3 : 4;

function PairCell(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: PairPoint };
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (cx === undefined || cy === undefined || !payload || !xScale || !yScale) return <g />;
  const cellWidth = Math.abs((xScale(payload.column + 0.5) ?? cx) - (xScale(payload.column - 0.5) ?? cx));
  const cellHeight = Math.abs((yScale(payload.row + 0.5) ?? cy) - (yScale(payload.row - 0.5) ?? cy));
  return <g data-nx-observation={payload.index}>
    {payload.value === 0 ? <circle data-nx-zero={payload.index} cx={cx} cy={cy} r={0.9} fill="var(--nx-plotFaint)" opacity={0.8} />
      : <rect data-nx-cell={payload.index} x={cx - cellWidth / 2} y={cy - cellHeight / 2} width={cellWidth} height={cellHeight}
        style={{ rx: 'var(--nx-radius-heatCell)' }} fill={tones[payload.band]} stroke="var(--nx-bg)" strokeWidth={2} />}
    {payload.peak && <g opacity={0.8}>
      <rect data-nx-peak="true" x={cx - 15} y={cy - 15} width={30} height={30} fill="none" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="4 2" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill={payload.band >= 3 ? 'var(--nx-paper)' : 'var(--nx-ink)'}
        fontSize="calc(var(--nx-type-plotValue-size) * 9 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{payload.value}</text>
    </g>}
  </g>;
}

function Diagonal({ count }: { count: number }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g aria-hidden="true" pointerEvents="none" opacity={0.8}>{Array.from({ length: count }, (_, index) => {
    const x = xScale(index); const y = yScale(index);
    return x === undefined || y === undefined ? null : <rect key={index} data-nx-self={index} x={x - 3} y={y - 0.6} width={6} height={1.2} fill="var(--nx-plotFaint)" />;
  })}</g>;
}

/** Fixed percentage bands keep the same value the same shade across datasets. */
export function MatrixHeat({ features, data, height, width, animate = true, className = '', 'aria-label': label = 'Feature co-usage' }: MatrixHeatProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  const points = useMemo(() => {
    const valid = data.flatMap((row, rowIndex) => row.flatMap((value, column): Omit<PairPoint, 'peak'>[] => rowIndex < features.length && column < features.length && rowIndex !== column && value !== null && Number.isFinite(value) && value >= 0 && value <= 100
      ? [{ row: rowIndex, column, value, index: `${rowIndex}:${column}`, band: bandOf(value) }] : []));
    const maximum = Math.max(0, ...valid.map((point) => point.value));
    const peak = maximum > 0 ? valid.find((point) => point.value === maximum)?.index : undefined;
    return valid.map((point): PairPoint => ({ ...point, peak: point.index === peak }));
  }, [data, features.length]);
  const visible = points.filter((point) => point.value === 0 || !hidden.has(point.band));
  return <div ref={ref} className={`nx-matrix-heat flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="matrix-heat" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No comparable pairs available.</div> : <div className={height === undefined ? 'relative aspect-[560/400] min-h-[320px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 386 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each cell shows the percentage using both features. A dash is an inapplicable self-pair; a tiny dot is a measured zero. The legend toggles the five percentage bands. Use the left and right arrow keys to inspect available pairs."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 0, right: 20, bottom: 56, left: 0 }}>
          <XAxis dataKey="column" type="number" domain={[-0.5, features.length - 0.5]} orientation="top" height={54} ticks={features.map((_, index) => index)} interval={0} tickLine={false} axisLine={false}
            tick={({ x, y, payload }) => <text x={x} y={y} transform={`rotate(55 ${x} ${y})`} textAnchor="end" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 7 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{features[payload.value] ?? ''}</text>} />
          <YAxis dataKey="row" type="number" domain={[-0.5, features.length - 0.5]} reversed width={74} ticks={features.map((_, index) => index)} interval={0}
            tickFormatter={(row: number) => features[row] ?? ''} tickLine={false} axisLine={false} tickMargin={8} tickSize={0}
            tick={{ fill: 'var(--nx-markMuted)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-cardTitle-weight)' }} />
          <Diagonal count={features.length} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as PairPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{features[point.row]} × {features[point.column]} — {point.value}% of accounts use both</div> : null;
          }} />
          <Scatter id={`${id}-pairs`} data={visible} name="Co-usage" fill="var(--nx-ink)" shape={<PairCell />} activeShape={<PairCell />} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div aria-label="Percentage bands" className="absolute inset-x-0 bottom-[34px] flex justify-center gap-[10px] text-[length:var(--nx-type-axis-size)] text-[var(--nx-muted)]">
        {bandLabels.map((band, index) => <button key={band} type="button" aria-pressed={!hidden.has(index)} onClick={() => setHidden((previous) => {
          const next = new Set(previous); if (next.has(index)) next.delete(index); else next.add(index); return next;
        })} className="flex cursor-pointer items-center gap-[10px] border-0 bg-transparent p-0 text-inherit focus-visible:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" style={{ opacity: hidden.has(index) ? 0.35 : 1 }}>
          <span aria-hidden="true" className="block size-[11px]" style={{ background: tones[index] }} />{band}
        </button>)}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">DASH = A FEATURE AGAINST ITSELF · TINY DOT = A PAIRING NOBODY USES</div>
    </div>}
  </div>;
}
