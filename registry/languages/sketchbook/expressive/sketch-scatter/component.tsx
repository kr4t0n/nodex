'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { useSketchSettings, type SketchSettings } from '../../../../_shared/sketch/use-sketch-settings';
import { SketchCircle } from '../../../../_shared/sketch/marks';
import { sketchSeed, uniqueIds, finite, numericDomain, type SketchTone } from '../../../../_shared/sketch/identity';
import { SketchFrame, SketchPlot, SketchStatus, SketchTooltip, sketchTick, sketchFocus, compactNumber, formatNumber, type SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchScatterDatum { id: string; label: string; x: number | null; y: number | null; tone?: SketchTone }
export interface SketchScatterProps extends SketchPresentationProps { data: readonly SketchScatterDatum[]; xLabel?: string; yLabel?: string }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };
interface Point extends SketchScatterDatum { x: number; y: number; paint: string }
function Mark({ value, settings }: { value: unknown; settings: SketchSettings | null }) {
  const { cx, cy, payload } = value as { cx: number; cy: number; payload: Point };
  return <g data-nx-sketch-point={payload.id} data-nx-x={payload.x} data-nx-y={payload.y}><SketchCircle cx={cx} cy={cy} radius={8} settings={settings} seed={sketchSeed(payload.id)} paint={payload.paint} hatchWidth="var(--nx-sketch-fillWeight)" /></g>;
}
export function SketchScatter({ data, xLabel = 'X', yLabel = 'Y', unitLabel = 'Observations', contextLabel, valueFormatter = formatNumber, width, height, animate = true, className = '', 'aria-label': label = 'Paired numeric observations' }: SketchScatterProps) {
  const { ref, ...motion } = useChartMotion(animate); const settings = useSketchSettings(ref); const id = useId();
  const points = useMemo(() => data.flatMap((row): Point[] => { const x = finite(row.x); const y = finite(row.y); return x === null || y === null ? [] : [{ ...row, x, y, paint: row.tone ? paints[row.tone] : Object.values(paints)[sketchSeed(row.id) % 9]! }]; }), [data]);
  const status = !uniqueIds(data) ? 'Each observation needs a unique, nonempty ID.' : !points.length ? 'No observations available.' : null;
  return <SketchFrame ref={ref} slug="sketch-scatter" animated={motion.isAnimationActive} {...{ unitLabel, contextLabel, width, height, className }}>
    {status ? <SketchStatus>{status}</SketchStatus> : <SketchPlot height={height} minWidth={360}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}><ScatterChart accessibilityLayer title={label} className={sketchFocus}
        desc={`${xLabel} is horizontal and ${yLabel} is vertical. Every circle has equal size. Missing coordinates are omitted and counted. Use left and right arrows to inspect observations.`} margin={{ top: 20, right: 22, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-axis)" />
        <XAxis dataKey="x" type="number" name={xLabel} domain={numericDomain(points.map(p => p.x))} tick={sketchTick} tickFormatter={compactNumber} axisLine={false} tickLine={false} />
        <YAxis dataKey="y" type="number" name={yLabel} width={48} domain={numericDomain(points.map(p => p.y))} tick={sketchTick} tickFormatter={compactNumber} axisLine={false} tickLine={false} />
        <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const point = payload?.[0]?.payload as Point | undefined; return active && point ? <SketchTooltip><div>{point.label}</div><div>{xLabel}: {valueFormatter(point.x)}</div><div>{yLabel}: {valueFormatter(point.y)}</div></SketchTooltip> : null; }} />
        <Scatter id={id} data={points} name={unitLabel} fill="var(--nx-ink)" shape={(value: unknown) => <Mark value={value} settings={settings} />} activeShape={false} {...motion} />
      </ScatterChart></ResponsiveContainer>
    </SketchPlot>}
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"><span>Horizontal: {xLabel} · Vertical: {yLabel}</span>{points.length !== data.length && <span data-nx-sketch-omitted>{data.length - points.length} unavailable</span>}</div>
  </SketchFrame>;
}
