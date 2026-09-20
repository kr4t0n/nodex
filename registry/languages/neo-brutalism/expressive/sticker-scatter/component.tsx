'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { neoCategoryTone, type NeoCategoryTone } from '../../../../_shared/neo-categorical';
import { NeoChartFrame, NeoChartTooltip } from '../../../../_shared/neo-chart-frame';

export interface StickerScatterDatum { id: string; label: string; x: number | null; y: number | null; tone?: NeoCategoryTone }
export interface StickerScatterProps {
  data: readonly StickerScatterDatum[]; xLabel?: string; yLabel?: string; contextLabel?: string;
  xFormatter?: (value: number) => string; yFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Point extends StickerScatterDatum { x: number; y: number; fill: string }
const tones: Record<NeoCategoryTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);

function Sticker(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Point };
  return cx === undefined || cy === undefined || !payload ? <g /> : <rect data-nx-sticker={payload.id} data-nx-x={payload.x} data-nx-y={payload.y}
    x={cx - 9} y={cy - 9} width={18} height={18} fill={payload.fill} stroke="var(--nx-ink)"
    style={{ strokeWidth: 'var(--nx-stroke-mark)', filter: 'drop-shadow(var(--nx-shadow-control) var(--nx-ink))' }} />;
}

/** Equal-size stickers encode two numeric variables through position, never area or hue. */
export function StickerScatter({ data, xLabel = 'X value', yLabel = 'Y value', contextLabel, xFormatter = formatNumber, yFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Relationship between two measurements' }: StickerScatterProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => data.flatMap((datum): Point[] => datum.x !== null && datum.y !== null && Number.isFinite(datum.x) && Number.isFinite(datum.y)
    ? [{ ...datum, x: datum.x, y: datum.y, fill: tones[neoCategoryTone(datum.id, datum.tone)] }] : []), [data]);
  const validIds = data.every(datum => datum.id.trim()) && new Set(data.map(datum => datum.id)).size === data.length;
  const xMin = Math.min(0, ...points.map(point => point.x)); const xMax = Math.max(0, ...points.map(point => point.x));
  const yMin = Math.min(0, ...points.map(point => point.y)); const yMax = Math.max(0, ...points.map(point => point.y));
  const status = !validIds ? 'Each observation needs a unique, nonempty ID.' : !points.length ? 'No complete observations available.' : null;
  return <NeoChartFrame ref={ref} name="sticker-scatter" heading={yLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={`mt-[var(--nx-space-cardBodyGap)] ${height === undefined ? 'aspect-[600/335] min-h-[290px]' : 'min-h-[220px] flex-1'}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 340 }}>
        <ScatterChart accessibilityLayer title={label} desc={`Sticker positions compare ${xLabel} horizontally and ${yLabel} vertically. Every sticker has the same size. Color identifies observations, not magnitude. Incomplete pairs are omitted and counted below. Use left and right arrow keys to inspect observations.`}
          margin={{ top: 18, right: 22, bottom: 6, left: 0 }} className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
          <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
          <XAxis dataKey="x" type="number" domain={[xMin, xMax || (xMin === 0 ? 1 : 0)]} padding={{ left: 14, right: 14 }} height={32} tickCount={5} tickLine={false} tickMargin={12}
            tickFormatter={(value: number) => compact.format(value)} axisLine={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)' }} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis dataKey="y" type="number" domain={[yMin, yMax || (yMin === 0 ? 1 : 0)]} padding={{ top: 14, bottom: 14 }} width={44} tickCount={4} tickLine={false} tickMargin={10}
            tickFormatter={(value: number) => compact.format(value)} axisLine={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)' }} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | undefined;
            return active && point ? <NeoChartTooltip title={point.label}><div>{xLabel}: {xFormatter(point.x)}</div><div>{yLabel}: {yFormatter(point.y)}</div></NeoChartTooltip> : null;
          }} />
          <Scatter id={`${id}-stickers`} data={points} name="Observations" shape={Sticker} activeShape={Sticker} fill="var(--nx-ink)" {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)] uppercase">
      <span>{xLabel}</span><span className="text-[var(--nx-muted)]">{points.length} observations{points.length < data.length ? ` · ${data.length - points.length} unavailable` : ''}</span>
    </div>
  </NeoChartFrame>;
}
