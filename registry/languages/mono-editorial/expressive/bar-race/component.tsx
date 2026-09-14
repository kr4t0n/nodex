'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Bar, BarChart, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type AnimationInterpolateFn, type BarRectangleItem, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface BarRaceProduct { id: string; name: string }
export interface BarRaceFrame { period: string; revenueK: readonly (number | null)[] }
export interface BarRaceProps {
  data: readonly BarRaceFrame[];
  products: readonly BarRaceProduct[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface RevenuePoint { productId: string; productName: string; revenueK: number | null; rank: number; tone: string }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
const interpolate = (from: number, to: number, time: number) => from + (to - from) * time;
const raceBars: AnimationInterpolateFn<BarRectangleItem, 'horizontal' | 'vertical'> = (items, time) => (items ?? []).flatMap(item => {
  if (item.status === 'removed') return [];
  const next = item.next; const previous = item.status === 'matched' ? item.prev : next;
  return [{ ...next, x: interpolate(previous.x, next.x, time), y: interpolate(previous.y, next.y, time), width: interpolate(previous.width, next.width, time), height: interpolate(previous.height, next.height, time),
    value: interpolate(typeof previous.value === 'number' ? previous.value : 0, typeof next.value === 'number' ? next.value : 0, time) }];
});
function ProductBar({ x, y, width, height, value, payload }: BarShapeProps) {
  const row = payload as RevenuePoint;
  return <g data-nx-observation={row.productId}>
    {row.revenueK !== null && row.revenueK > 0 && <Rectangle data-nx-revenue-bar={row.productId} x={x} y={y} width={width} height={height} radius={99} fill={row.tone} stroke="none" />}
    <text data-nx-product={row.productId} x={x - 8} y={y + height / 2} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 9.5 / 8)" fontWeight="var(--nx-type-axis-weight)" pointerEvents="none">{row.productName}</text>
    <text data-nx-revenue={row.productId} x={x + width + 5} y={y + height / 2} dominantBaseline="central" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 12 / 17)" fontWeight="var(--nx-type-pageTitle-weight)" pointerEvents="none">{row.revenueK === null ? '—' : `$${Math.round(typeof value === 'number' ? value : row.revenueK)}K`}</text>
  </g>;
}
function MissingProduct({ row }: { row: RevenuePoint }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const x = xScale(0) ?? 0; const y = yScale(row.productId, { position: 'middle' });
  return <g pointerEvents="none"><text data-nx-product={row.productId} x={x - 8} y={y} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 9.5 / 8)" fontWeight="var(--nx-type-axis-weight)">{row.productName}</text><text data-nx-revenue={row.productId} x={x + 5} y={y} dominantBaseline="central" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 12 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">—</text></g>;
}

/** Stable product identities follow ranked native Bar positions across a finite frame sequence. */
export function BarRace({ data, products, height, width, animate = true, className = '', 'aria-label': label = 'Product revenue across periods' }: BarRaceProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const frames = useMemo(() => data.map(frame => ({ period: frame.period, rows: products.map((product, index) => {
    const value = frame.revenueK[index]; return { productId: product.id, productName: product.name, column: index,
      revenueK: frame.revenueK.length === products.length && typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null };
  }).sort((a, b) => (b.revenueK ?? -1) - (a.revenueK ?? -1) || a.column - b.column).map((row, rank): RevenuePoint => ({ ...row, rank, tone: tones[Math.min(5, rank)]! })) })), [data, products]);
  const validProducts = products.length > 0 && products.every(product => product.id.length > 0) && new Set(products.map(product => product.id)).size === products.length;
  const lastIndex = Math.max(0, frames.length - 1); const [frameIndex, setFrameIndex] = useState(lastIndex); const [run, setRun] = useState(0);
  useEffect(() => {
    if (!motion.isAnimationActive || !validProducts || frames.length < 2) { setFrameIndex(lastIndex); return; }
    let index = 0; let timer: ReturnType<typeof setTimeout>;
    setFrameIndex(0);
    const advance = () => {
      index += 1; setFrameIndex(index);
      if (index < lastIndex) timer = setTimeout(advance, motion.animationDuration * 1.15);
    };
    timer = setTimeout(advance, motion.animationDuration * 1.15);
    return () => clearTimeout(timer);
  }, [frames, lastIndex, run, validProducts, motion.isAnimationActive, motion.animationDuration]);
  const selectedIndex = motion.isAnimationActive ? Math.min(frameIndex, lastIndex) : lastIndex; const frame = frames[selectedIndex];
  const rows = frame?.rows ?? []; const available = validProducts && rows.some(row => row.revenueK !== null); const maximum = Math.max(0, ...rows.map(row => row.revenueK ?? 0)) || 1;
  const replay = () => setRun(value => value + 1);
  return <div ref={ref} className={`nx-bar-race flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="bar-race" data-nx-animated={motion.isAnimationActive} data-nx-frame={selectedIndex}>
    {!validProducts || !frame ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No revenue readings available for {frame?.period ?? 'this period'}.</div> : <div className={height === undefined ? 'relative aspect-[580/320] min-h-[256px] w-full' : 'relative min-h-0 flex-1'}>
      <button type="button" onClick={replay} aria-label={`Showing ${frame?.period}. Replay from ${frames[0]?.period}.`} className="pointer-events-none absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus-visible:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)] focus-visible:outline-offset-4" />
      <div className="h-full cursor-pointer" onClick={replay}>
        {!available ? <div role="status" className="flex h-full items-center text-[var(--nx-muted)]">No revenue readings available for {frame.period}.</div> : <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
          <BarChart data={rows} layout="vertical" accessibilityLayer title={label} desc="The sequence plays once and holds on the final period. Click the plot or activate the replay button to restart. ArrowLeft advances through ranked products; ArrowRight returns. Reduced motion shows the final period."
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 8, bottom: 8, left: 0, right: 64 }} barCategoryGap="16%">
            <XAxis type="number" hide domain={[0, maximum]} />
            <YAxis dataKey="productId" type="category" scale="band" width={64} axisLine={false} tickLine={false} tick={false} />
            {rows.filter(row => row.revenueK === null).map(row => <MissingProduct key={row.productId} row={row} />)}
            <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: productId }) => {
              const row = rows.find(row => row.productId === productId);
              return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.productName} — {row.revenueK === null ? 'Unavailable' : `$${Math.round(row.revenueK)}K`}</div> : null;
            }} />
            <Bar id={`${id}-products`} dataKey="revenueK" name="Product revenue" shape={ProductBar} activeBar={false} fill="var(--nx-ink)" stroke="none" {...motion}
              isAnimationActive={motion.isAnimationActive && selectedIndex > 0} animationDuration={motion.animationDuration * 0.95} animationMatchBy={bar => (bar.payload as RevenuePoint).productId} animationInterpolateFn={raceBars} />
          </BarChart>
        </ResponsiveContainer>}
      </div>
      <div data-nx-period className="pointer-events-none absolute bottom-3.5 right-[18px] text-[length:calc(var(--nx-type-plotValue-size)*44/17)] font-[number:var(--nx-type-pageTitle-weight)] leading-none text-[var(--nx-grid)]">{frame?.period}</div>
    </div>}
  </div>;
}
