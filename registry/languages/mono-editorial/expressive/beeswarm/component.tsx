'use client';

import { useId, useMemo } from 'react';
import { ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { ZeroAxisRail } from '../../../../_shared/zero-axis-rail';

export interface BeeswarmDatum { valueK: number | null; enterprise: boolean }
export interface BeeswarmProps {
  data: readonly BeeswarmDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DealPoint { valueK: number; enterprise: boolean; lane: number; row: number; index: number }
const laneOf = (valueK: number) => Math.round(valueK / 180 * 44);

function DealDot(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: DealPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <g data-nx-observation={payload.index}><circle data-nx-deal={payload.index} data-nx-enterprise={payload.enterprise} cx={cx} cy={cy} r={3.5}
    fill={payload.enterprise ? 'var(--nx-bg)' : 'var(--nx-ink)'} stroke={payload.enterprise ? 'var(--nx-ink)' : 'none'}
    strokeWidth="var(--nx-stroke-emphasis)" opacity={payload.enterprise ? 0.8 : 0.82} /></g>;
}

function MedianLabel({ median, tallest }: { median: number; tallest: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const x = xScale?.(laneOf(median)); const y = yScale?.(tallest + 2.2);
  if (x === undefined || y === undefined) return null;
  return <text data-nx-median={median} x={x} y={y - 5} dy="-0.5em" dominantBaseline="central" textAnchor="middle" fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" opacity={0.8}
    fontSize="calc(var(--nx-type-plotValue-size) * 9.5 / 17)" fontWeight="var(--nx-type-pageTitle-weight)" pointerEvents="none">MEDIAN ${median}k</text>;
}

/** Stable lane piles retain one mark per deal; the median is the upper middle observation. */
export function Beeswarm({ data, height, width, animate = true, className = '', 'aria-label': label = 'Distribution of closed deal values' }: BeeswarmProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, median, tallest } = useMemo(() => {
    const valid = data.flatMap((deal, index) => deal.valueK !== null && Number.isFinite(deal.valueK) && deal.valueK >= 0
      ? [{ valueK: deal.valueK, enterprise: deal.enterprise, index }] : []).sort((a, b) => a.valueK - b.valueK || a.index - b.index);
    const heights = new Map<number, number>();
    const points: DealPoint[] = valid.map((deal) => {
      const lane = laneOf(deal.valueK); const row = heights.get(lane) ?? 0;
      heights.set(lane, row + 1); return { ...deal, lane, row };
    });
    return { points: points.sort((a, b) => Number(a.enterprise) - Number(b.enterprise)), median: valid[Math.floor(valid.length / 2)]?.valueK ?? 0, tallest: Math.max(0, ...heights.values()) };
  }, [data]);
  const right = Math.max(45, ...points.map((point) => point.lane + 1));
  const tickStep = Math.max(5, Math.ceil(right / 45) * 5);
  const ticks = [-1, ...Array.from({ length: Math.floor(right / tickStep) + 1 }, (_, index) => index * tickStep), ...(right % tickStep ? [right] : [])];
  return <div ref={ref} className={`nx-beeswarm flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="beeswarm" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each dot is a deal, piled in a value lane. Hollow dots identify enterprise deals. The dashed rule is the median of available observations. Use the left and right arrow keys to inspect deals."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 44, right: 26, bottom: 0, left: 26 }}>
          <XAxis dataKey="lane" type="number" domain={[-1, right]} height={54} ticks={ticks} interval={0} tickSize={0} tickMargin={8}
            tickFormatter={(lane: number) => lane % 15 === 0 ? `$${Math.round(lane / 44 * 180)}k` : ''}
            tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-faint)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis dataKey="row" type="number" hide domain={[-0.5, tallest + 3]} />
          <ZeroAxisRail ticks={ticks} domain={[-1, right]} stroke="var(--nx-grid)" tickStroke="var(--nx-plotFloor)" />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as DealPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">${point.valueK}k{point.enterprise ? ' · enterprise' : ''}</div> : null;
          }} />
          <Scatter id={`${id}-deals`} data={points} name="Deals" fill="var(--nx-ink)" shape={DealDot} activeShape={DealDot} {...motion} />
          <ReferenceLine segment={[{ x: laneOf(median), y: -0.5 }, { x: laneOf(median), y: tallest + 1.6 }]} stroke="var(--nx-muted)" strokeWidth="calc(var(--nx-stroke-hairline) * 9 / 7)" strokeDasharray="2 4" pointerEvents="none" />
          <MedianLabel median={median} tallest={tallest} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE DOT = ONE DEAL · THE PILE IS THE DISTRIBUTION · HOLLOW = ENTERPRISE</div>
    </div>}
  </div>;
}
