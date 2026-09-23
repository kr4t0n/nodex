'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { studioTone, type StudioTone } from '../../../../_shared/studio-categorical';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftScatterDatum { id: string; label: string; x: number | null; y: number | null; tone?: StudioTone }
export interface SoftScatterProps {
  data: readonly SoftScatterDatum[]; xLabel?: string; yLabel?: string; contextLabel?: string;
  xFormatter?: (value: number) => string; yFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Point extends SoftScatterDatum { x: number; y: number; fill: string }
const tones: Record<StudioTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Observation(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Point };
  return !payload || cx === undefined || cy === undefined ? <g /> : <circle cx={cx} cy={cy} r={7}
    data-nx-soft-scatter={payload.id} data-nx-x={payload.x} data-nx-y={payload.y}
    fill={payload.fill} stroke="var(--nx-surfaceFill)" strokeWidth="var(--nx-stroke-mark)" />;
}

/** Equal-size circles compare two measurements; invalid pairs are omitted and counted. */
export function SoftScatter({ data, xLabel = 'X value', yLabel = 'Y value', contextLabel, xFormatter = formatNumber, yFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Relationship between two measurements' }: SoftScatterProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const points = useMemo(() => data.flatMap((datum): Point[] => datum.x !== null && datum.y !== null && Number.isFinite(datum.x) && Number.isFinite(datum.y)
    ? [{ ...datum, x: datum.x, y: datum.y, fill: tones[studioTone(datum.id, datum.tone)] }] : []), [data]);
  const valid = data.every(datum => datum.id.trim()) && new Set(data.map(datum => datum.id)).size === data.length;
  const xMin = Math.min(0, ...points.map(point => point.x)); const xMax = Math.max(0, ...points.map(point => point.x));
  const yMin = Math.min(0, ...points.map(point => point.y)); const yMax = Math.max(0, ...points.map(point => point.y));
  const status = !valid ? 'Each observation needs a unique, nonempty ID.' : !points.length ? 'No complete observations available.' : null;

  return <StudioChartFrame ref={ref} name="soft-scatter" heading={yLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-hidden ${height === undefined ? 'h-[260px]' : 'min-h-0 flex-1'}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 260 }}>
        <ScatterChart accessibilityLayer title={label}
          desc={`Circle positions show ${xLabel} horizontally and ${yLabel} vertically. Every circle has the same size; color identifies observations. Incomplete pairs are omitted and counted below. Use left and right arrow keys to inspect observations.`}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
          <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis dataKey="x" type="number" domain={[xMin, xMax || (xMin === 0 ? 1 : 0)]} padding={{ left: 10, right: 10 }} height={34} tickMargin={12}
            tickCount={5} axisLine={false} tickLine={false} tickFormatter={(value: number) => compact.format(value)}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis dataKey="y" type="number" domain={[yMin, yMax || (yMin === 0 ? 1 : 0)]} padding={{ top: 10, bottom: 10 }} width={42}
            tickCount={4} axisLine={false} tickLine={false} tickFormatter={(value: number) => compact.format(value)}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | undefined;
            return active && point ? <StudioChartTooltip title={point.label}><div>{xLabel}: {xFormatter(point.x)}</div><div>{yLabel}: {yFormatter(point.y)}</div></StudioChartTooltip> : null;
          }} />
          <Scatter id={`${id}-observations`} data={points} name="Observations" fill="var(--nx-seriesA)" shape={Observation} activeShape={false} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span>{xLabel}</span><span data-nx-soft-scatter-count>{points.length} observations{points.length < data.length ? ` · ${data.length - points.length} unavailable` : ''}</span>
    </div>
  </StudioChartFrame>;
}
