'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Curve, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface CandlestickDatum { day: string; open: number | null; close: number | null; low: number | null; high: number | null }
export interface CandlestickProps {
  data: readonly CandlestickDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Quote { open: number; close: number; low: number; high: number }
interface DayPoint { day: string; index: number; quote: Quote | null; range: [number, number] | null }
function PriceCandle({ x, width, payload, isAnimating, animationElapsedTime }: BarShapeProps) {
  const row = payload as DayPoint; const yScale = useYAxisScale();
  if (!row.quote || !yScale) return <g />;
  const quote = row.quote; const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  const at = (value: number) => yScale(quote.open + (value - quote.open) * progress) ?? 0;
  const openY = at(quote.open); const closeY = at(quote.close); const center = x + width / 2;
  return <g data-nx-observation={row.index}>
    <Curve data-nx-wick={row.index} points={[{ x: center, y: at(quote.high) }, { x: center, y: at(quote.low) }]} type="linear" fill="none" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" />
    {quote.open === quote.close ? <Curve data-nx-doji={row.index} points={[{ x, y: openY }, { x: x + width, y: openY }]} type="linear" fill="none" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" /> : <Rectangle data-nx-candle={row.index} data-nx-direction={quote.close > quote.open ? 'up' : 'down'} x={x} y={Math.min(openY, closeY)} width={width} height={Math.abs(openY - closeY)} radius={0}
      fill={quote.close > quote.open ? 'var(--nx-bg)' : 'var(--nx-ink)'} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" />}
  </g>;
}
function Extremes({ rows }: { rows: readonly DayPoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const available = rows.filter((row): row is DayPoint & { quote: Quote } => row.quote !== null);
  if (!xScale || !yScale || !available.length) return null;
  const highest = available.reduce((best, row) => row.quote.high > best.quote.high ? row : best);
  const lowest = available.reduce((best, row) => row.quote.low < best.quote.low ? row : best);
  const labels = [{ key: 'high', index: highest.index, value: highest.quote.high }, ...(highest.index === lowest.index && highest.quote.high === lowest.quote.low ? [] : [{ key: 'low', index: lowest.index, value: lowest.quote.low }])];
  return <g pointerEvents="none" aria-hidden="true" opacity={0.8}>{labels.map(label => <text key={label.key} data-nx-extreme={label.key} x={xScale(label.index, { position: 'middle' })} y={(yScale(label.value) ?? 0) - 6} dy="-0.5em" textAnchor="middle" dominantBaseline="central"
    fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeMiterlimit={2} fontSize="calc(var(--nx-type-plotValue-size) * 8 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">${Math.round(label.value)}</text>)}</g>;
}

/** A real range Bar owns each day's full reach; its custom marks retain open/close direction. */
export function Candlestick({ data, height, width, animate = true, className = '', 'aria-label': label = 'Daily open, close, low and high prices' }: CandlestickProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): DayPoint => {
    const { open, close, low, high } = row;
    const quote = typeof open === 'number' && typeof close === 'number' && typeof low === 'number' && typeof high === 'number' && [open, close, low, high].every(value => Number.isFinite(value) && value >= 0)
      && low <= Math.min(open, close) && high >= Math.max(open, close) ? { open, close, low, high } : null;
    return { day: row.day, index, quote, range: quote ? [quote.low, quote.high] : null };
  }), [data]);
  const quotes = rows.flatMap(row => row.quote ? [row.quote] : []); const available = quotes.length > 0;
  const low = Math.min(...quotes.map(quote => quote.low)); const high = Math.max(...quotes.map(quote => quote.high));
  const constantDomain: [number, number] = low === 0 ? [0, 1] : [Math.max(0, low - Math.max(1, low * 0.05)), high + Math.max(1, high * 0.05)];
  return <div ref={ref} className={`nx-candlestick flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="candlestick" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete price quotes available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart data={rows} accessibilityLayer title={label} desc="Hollow bodies closed up; ink bodies closed down. Wicks show each day's full range, and a horizontal body means unchanged price. Use the left and right arrow keys to inspect days, including unavailable quotes."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 40, bottom: 30, left: 0, right: 20 }}>
          <CartesianGrid vertical={false} stroke="var(--nx-plotGrid)" strokeWidth="calc(var(--nx-stroke-hairline) * 8 / 7)" />
          <XAxis dataKey="index" type="category" scale="band" hide />
          <YAxis type="number" width={42} domain={low === high ? constantDomain : ['auto', 'auto']} tickCount={7} niceTicks="snap125" axisLine={false} tickLine={false} tickSize={0} tickMargin={8}
            tick={{ fill: 'var(--nx-muted)', fontFamily: 'var(--nx-font-sans)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} tickFormatter={value => `$${Math.round(value)}`} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const row = typeof index === 'number' ? rows[index] : undefined; const quote = row?.quote;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.day} — {quote ? `open $${quote.open.toFixed(1)} · close $${quote.close.toFixed(1)} · high $${quote.high.toFixed(1)} · low $${quote.low.toFixed(1)}` : 'Unavailable'}</div> : null;
          }} />
          <Bar id={`${id}-quotes`} dataKey="range" name="Daily price range" barSize={7} shape={PriceCandle} activeBar={false} fill="var(--nx-ink)" stroke="none" {...motion} />
          <Extremes rows={rows} />
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markMuted)]">HOLLOW = CLOSED UP · INK = CLOSED DOWN · WICK = THE DAY’S RANGE</div>
    </div>}
  </div>;
}
