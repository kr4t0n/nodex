'use client';

import { useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { softPolylineCurve } from '../../../../_shared/constrained-curve';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ParallelCoordsDatum { product: string; values: readonly (number | null)[] }
export interface ParallelCoordsDimension { label: string; min: number; max: number; scored: boolean }
export interface ParallelCoordsProps {
  data: readonly ParallelCoordsDatum[];
  dimensions: readonly ParallelCoordsDimension[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface ProductPoint { index: number; product: string; values: readonly number[] | null; normalized: readonly number[] | null; score: number | null; x: number; y: number; hero: boolean; selected: boolean; brushing: boolean }
type Interval = readonly [number, number];
const smooth = softPolylineCurve(0.2);
function ProductLine(props: unknown) {
  const { payload, isAnimating, animationElapsedTime } = props as { payload?: ProductPoint; isAnimating?: boolean; animationElapsedTime?: number }; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload?.normalized || !xScale || !yScale) return <g />;
  const opacity = payload.brushing ? payload.selected ? 1 : 0.05 : payload.hero ? 1 : 0.55;
  return <g data-nx-observation={payload.index}><Curve data-nx-product-line={payload.index} data-nx-hero={payload.hero} data-nx-selected={payload.selected} points={payload.normalized.map((value, index) => ({ x: xScale(index) ?? 0, y: yScale(value) ?? 0 }))} type={smooth} fill="none" stroke={payload.hero ? 'var(--nx-ink)' : 'var(--nx-markQuiet)'} strokeWidth={payload.hero ? 'calc(var(--nx-stroke-hairline) * 2)' : 'calc(var(--nx-stroke-mark) * 0.8)'} opacity={opacity * (isAnimating ? animationElapsedTime ?? 0 : 1)} /></g>;
}
function ParallelScale({ dimension, index, interval, onRange }: { dimension: ParallelCoordsDimension; index: number; interval: Interval | undefined; onRange: (index: number, interval: Interval | null) => void }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const start = useRef<number | null>(null);
  if (!xScale || !yScale) return null; const x = xScale(index) ?? 0; const top = yScale(1) ?? 0; const bottom = yScale(0) ?? 0;
  const fraction = (event: PointerEvent<SVGRectElement>) => {
    const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return 0;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return Math.max(0, Math.min(1, (bottom - point.y) / (bottom - top)));
  };
  return <g data-nx-parallel-axis={index}>
    <line x1={x} x2={x} y1={top} y2={bottom} stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-mark)" />
    <g pointerEvents="none"><text x={x} y={top - 16} textAnchor="middle" dominantBaseline="auto" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 7 / 8)" fontWeight="var(--nx-type-pageTitle-weight)">{dimension.label}</text>
      {[{ value: dimension.min, y: bottom }, { value: dimension.max, y: top }].map(mark => <text key={mark.value} data-nx-axis-end={mark.value} x={x + 8} y={mark.y} dominantBaseline="central" fill="var(--nx-faint)" fontSize="calc(var(--nx-type-axis-size) * 6.5 / 8)" fontWeight="var(--nx-type-axis-weight)">{mark.value}</text>)}
      {interval && <rect data-nx-axis-selection={index} x={x - 10} y={yScale(interval[1])} width={20} height={Math.max(0, (yScale(interval[0]) ?? 0) - (yScale(interval[1]) ?? 0))} fill="var(--nx-ink)" fillOpacity={0.12} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" />}
    </g>
    <rect data-nx-axis-brush={index} x={x - 10} y={top} width={20} height={Math.max(0, bottom - top)} fill="transparent" className="cursor-crosshair touch-none"
      onPointerDown={event => { if (event.button !== 0) return; start.current = fraction(event); event.currentTarget.setPointerCapture(event.pointerId); onRange(index, [start.current, start.current]); }}
      onPointerMove={event => { if (start.current === null) return; const end = fraction(event); onRange(index, [Math.min(start.current, end), Math.max(start.current, end)]); }}
      onPointerUp={event => { if (start.current === null) return; const end = fraction(event); onRange(index, Math.abs(start.current - end) < 0.01 ? null : [Math.min(start.current, end), Math.max(start.current, end)]); start.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { start.current = null; onRange(index, null); }} />
  </g>;
}

/** Each native observation spans the caller's parallel scales; price need not participate in scoring. */
export function ParallelCoords({ data, dimensions, height, width, animate = true, className = '', 'aria-label': label = 'Products across parallel dimensions' }: ParallelCoordsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const [selection, setSelection] = useState<{ dimensions: readonly ParallelCoordsDimension[]; ranges: Record<number, Interval> }>({ dimensions, ranges: {} });
  const ranges = selection.dimensions === dimensions ? selection.ranges : {}; const brushing = Object.keys(ranges).length > 0;
  const layout = useMemo(() => {
    const valid = dimensions.length >= 2 && dimensions.some(dimension => dimension.scored) && dimensions.every(dimension => Number.isFinite(dimension.min) && Number.isFinite(dimension.max) && dimension.max > dimension.min);
    const rows = data.map((row, index) => { const values = valid && row.values.length === dimensions.length && row.values.every((value): value is number => typeof value === 'number' && Number.isFinite(value)) ? row.values : null;
      const normalized = values?.map((value, index) => (value - dimensions[index]!.min) / (dimensions[index]!.max - dimensions[index]!.min)) ?? null;
      return { index, product: row.product, values, normalized, score: normalized ? normalized.reduce((sum, value, index) => sum + (dimensions[index]!.scored ? value : 0), 0) : null, x: 0, y: normalized?.[0] ?? 0 };
    });
    const hero = rows.reduce<(typeof rows)[number] | null>((best, row) => row.score !== null && (!best || row.score > best.score!) ? row : best, null);
    return { rows, hero, valid: valid && hero !== null };
  }, [data, dimensions]);
  const rows: ProductPoint[] = layout.rows.map(row => ({ ...row, hero: row.index === layout.hero?.index, brushing, selected: row.normalized !== null && Object.entries(ranges).every(([index, range]) => row.normalized![Number(index)]! >= range[0] && row.normalized![Number(index)]! <= range[1]) })).sort((a, b) => Number(a.hero) - Number(b.hero));
  const setRange = (index: number, interval: Interval | null) => setSelection(previous => { const next = previous.dimensions === dimensions ? { ...previous.ranges } : {}; if (interval) next[index] = interval; else delete next[index]; return { dimensions, ranges: next }; });
  return <div ref={ref} className={`nx-parallel-coords flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="parallel-coords" data-nx-animated={motion.isAnimationActive} onKeyDown={event => { if (event.key === 'Escape') setSelection({ dimensions, ranges: {} }); }}>
    {!layout.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete product readings or valid dimensions available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="One line follows each product through the supplied ranges. Ink maximizes the sum of normalized scored dimensions. Drag on an axis to select a range; click that axis or press Escape to clear. Use the left and right arrow keys to inspect products."
          className="[&_.recharts-scatter]:[clip-path:none] [&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 46, bottom: 30, left: 60, right: 42 }}>
          <XAxis dataKey="x" type="number" hide domain={[0, dimensions.length - 1]} allowDataOverflow />
          <YAxis dataKey="y" type="number" hide domain={[0, 1]} allowDataOverflow />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as ProductPoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.product} — {row.values ? dimensions.map((dimension, index) => `${dimension.label}: ${row.values![index]}`).join(' · ') : 'Unavailable'}</div> : null;
          }} />
          <Scatter id={`${id}-products`} data={rows} name="Products" fill="var(--nx-ink)" shape={ProductLine} activeShape={ProductLine} {...motion} />
          {dimensions.map((dimension, index) => <ParallelScale key={index} dimension={dimension} index={index} interval={ranges[index]} onRange={setRange} />)}
        </ScatterChart>
      </ResponsiveContainer>
      <div data-nx-highlight className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE LINE = ONE PRODUCT · INK = BEST ALL-ROUND ({layout.hero?.product.toUpperCase()})</div>
    </div>}
  </div>;
}
