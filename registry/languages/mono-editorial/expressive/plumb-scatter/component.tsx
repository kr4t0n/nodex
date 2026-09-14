'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface PlumbScatterDatum { product: string; pricePercentile: number | null; satisfaction: number | null }
export interface PlumbScatterProps {
  data: readonly PlumbScatterDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface ProductPoint { product: string; pricePercentile: number; satisfaction: number; index: number; hero: boolean }

function ProductMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: ProductPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const radius = payload.hero ? 4.6 : 2.6;
  return <g data-nx-observation={payload.index} opacity={0.8}>
    <circle data-nx-product={payload.index} cx={cx} cy={cy} r={radius} fill={payload.hero ? 'var(--nx-ink)' : 'var(--nx-markDeep)'} />
    {payload.hero && <text x={cx} y={cy - radius - 6} textAnchor="middle" fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
      fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)" fontWeight="var(--nx-type-pageTitle-weight)">{payload.product} · {payload.satisfaction}</text>}
  </g>;
}

function PriceGuides({ observations, floor }: { observations: readonly ProductPoint[]; floor: number }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const area = usePlotArea();
  const y = yScale?.(floor);
  if (!xScale || !yScale || !area || y === undefined) return null;
  return <g aria-hidden="true" pointerEvents="none">
    <text transform={`translate(${area.x - 24} ${area.y + area.height / 2}) rotate(-90)`} textAnchor="middle" dominantBaseline="central"
      fill="var(--nx-faint)" fontSize="calc(var(--nx-type-axis-size) * 7 / 8)" fontWeight="var(--nx-type-axis-weight)">HAPPIER ↑</text>
    {observations.map((point) => <line key={point.index} data-nx-stem={point.index} x1={xScale(point.pricePercentile)} x2={xScale(point.pricePercentile)} y1={y} y2={yScale(point.satisfaction)}
      stroke="var(--nx-markQuiet)" strokeWidth="calc(var(--nx-stroke-hairline) * 0.55 / 0.7)" opacity={0.6} />)}
    {Array.from({ length: 21 }, (_, index) => {
      const x = xScale(index * 5);
      if (x === undefined || x < area.x || x > area.x + area.width) return null;
      const length = index % 5 === 0 ? 7 : 4;
      return <line key={index} data-nx-floor-tick={index} x1={x} x2={x} y1={y - 2 - length / 2} y2={y - 2 + length / 2}
        stroke="var(--nx-plotFloor)" strokeWidth="calc(var(--nx-stroke-hairline) * 6 / 7)" opacity={0.8} />;
    })}
  </g>;
}

/** Price and satisfaction use library scales; each product retains one interaction stop. */
export function PlumbScatter({ data, height, width, animate = true, className = '', 'aria-label': label = 'Price against satisfaction' }: PlumbScatterProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    const valid = data.flatMap((point, index) => point.pricePercentile !== null && point.satisfaction !== null && Number.isFinite(point.pricePercentile) && Number.isFinite(point.satisfaction)
      && point.pricePercentile >= 0 && point.pricePercentile <= 100 && point.satisfaction >= 0 && point.satisfaction <= 100 ? [{ product: point.product, pricePercentile: point.pricePercentile, satisfaction: point.satisfaction, index }] : []);
    const ranked = [...valid].sort((a, b) => a.satisfaction - b.satisfaction || a.index - b.index);
    return valid.map((point): ProductPoint => ({ ...point, hero: point.index === ranked[0]?.index || point.index === ranked.at(-1)?.index }));
  }, [data]);
  const floor = Math.min(20, ...points.map((point) => point.satisfaction));
  const top = Math.max(96, ...points.map((point) => point.satisfaction));
  const left = Math.min(10, ...points.map((point) => point.pricePercentile));
  const right = Math.max(98, ...points.map((point) => point.pricePercentile));
  return <div ref={ref} className={`nx-plumb-scatter flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="plumb-scatter" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Dot position shows price percentile and satisfaction. A stem drops to the price scale; the highest and lowest satisfaction are labelled. Use the left and right arrow keys to inspect products."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 26, right: 26, bottom: 0, left: 0 }}>
          <XAxis dataKey="pricePercentile" type="number" domain={[left, right]} height={52} ticks={[left, right]} tickLine={false}
            tickFormatter={(value: number) => value === left ? 'CHEAP' : 'PREMIUM'} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tick={{ fill: 'var(--nx-faint)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis dataKey="satisfaction" type="number" domain={[floor, top]} width={40} axisLine={false} tickLine={false} tick={false} />
          <PriceGuides observations={points} floor={floor} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as ProductPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.product} — price {point.pricePercentile} · satisfaction {point.satisfaction}</div> : null;
          }} />
          <Scatter id={`${id}-products`} data={points} name="Products" fill="var(--nx-ink)" shape={ProductMark} activeShape={ProductMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE DOT = ONE PRODUCT · STEM DROPS TO ITS PRICE · TICK = 5%</div>
    </div>}
  </div>;
}
