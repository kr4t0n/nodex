'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type LineDrawShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { useSketchSettings, type SketchSettings } from '../../../../_shared/sketch/use-sketch-settings';
import { SketchCircle, SketchSegment } from '../../../../_shared/sketch/marks';
import { sketchSeed, uniqueIds, finite, numericDomain, type SketchTone } from '../../../../_shared/sketch/identity';
import { SketchFrame, SketchPlot, SketchStatus, SketchTooltip, SketchKey, sketchTick, sketchFocus, compactNumber, formatNumber, type SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchLineSeries { id: string; label: string; tone?: SketchTone }
export interface SketchLineDatum { id: string; label: string; x: number; values: Readonly<Record<string, number | null>> }
export interface SketchLineProps extends SketchPresentationProps { data: readonly SketchLineDatum[]; series: readonly SketchLineSeries[]; xFormatter?: (value: number) => string }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };
interface Row { id: string; label: string; x: number; values: (number | null)[] }
function Stroke({ points, isAnimating, animationElapsedTime, settings, seriesId, paint, rows }: LineDrawShapeProps & { settings: SketchSettings | null; seriesId: string; paint: string; rows: readonly Row[] }) {
  return <g data-nx-sketch-line={seriesId} opacity={isAnimating ? animationElapsedTime : 1}>{points?.slice(1).map((point, index) => {
    const before = points[index]!;
    if (before.x === null || before.y === null || point.x === null || point.y === null) return null;
    return <g key={index} data-nx-sketch-segment={`${seriesId}:${index}`}><SketchSegment x1={before.x} y1={before.y} x2={point.x} y2={point.y} settings={settings}
      seed={sketchSeed(JSON.stringify([seriesId, rows[index]?.id, rows[index + 1]?.id]))} paint={paint} /></g>;
  })}</g>;
}
function Dot({ value, settings, paint, seriesId }: { value: unknown; settings: SketchSettings | null; paint: string; seriesId: string }) {
  const { cx, cy, payload } = value as { cx?: number; cy?: number; payload?: Row };
  return cx === undefined || cy === undefined || !Number.isFinite(cx) || !Number.isFinite(cy) || !payload ? <g /> : <g data-nx-line-point={payload.id} data-nx-series={seriesId}>
    <SketchCircle cx={cx} cy={cy} radius={5} settings={settings} seed={sketchSeed(JSON.stringify([seriesId, payload.id]))} paint={paint} hatchWidth="var(--nx-sketch-fillWeight)" />
  </g>;
}
export function SketchLine({ data, series, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber, xFormatter = compactNumber, width, height, animate = true, className = '', 'aria-label': label = 'Values along a numeric axis' }: SketchLineProps) {
  const { ref, ...motion } = useChartMotion(animate); const settings = useSketchSettings(ref); const id = useId();
  const keys = useMemo(() => series.map(item => ({ ...item, paint: item.tone ? paints[item.tone] : Object.values(paints)[sketchSeed(item.id) % 9]! })), [series]);
  const rows = useMemo(() => data.map((row): Row => ({ id: row.id, label: row.label, x: row.x, values: series.map(item => finite(row.values[item.id])) })), [data, series]);
  const values = rows.flatMap(row => row.values.filter((value): value is number => value !== null));
  const status = !series.length ? 'No series to compare.' : !rows.length ? 'No observations available.' : !uniqueIds(data) || !uniqueIds(series) ? 'Observations and series each need unique, nonempty IDs.'
    : !rows.every((row, i) => Number.isFinite(row.x) && (i === 0 || row.x > rows[i - 1]!.x)) ? 'X coordinates must be finite and strictly increasing.' : !values.length ? 'No observations available.' : null;
  return <SketchFrame ref={ref} slug="sketch-line" animated={motion.isAnimationActive} {...{ unitLabel, contextLabel, width, height, className }}>
    <SketchKey items={keys} />
    {status ? <SketchStatus>{status}</SketchStatus> : <SketchPlot height={height} minWidth={360}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}><LineChart data={rows} accessibilityLayer title={label} className={sketchFocus}
        desc={`Horizontal distance follows the supplied numeric X coordinates. Height shows ${unitLabel}. Missing readings break each series independently. Use left and right arrows to inspect observations.`} margin={{ top: 20, right: 22, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-axis)" />
        <XAxis dataKey="x" type="number" domain={numericDomain(rows.map(row => row.x))} tick={sketchTick} tickFormatter={xFormatter} axisLine={false} tickLine={false} />
        <YAxis type="number" domain={numericDomain(values)} width={48} tick={sketchTick} tickFormatter={compactNumber} axisLine={false} tickLine={false} />
        <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: x }) => { const row = rows.find(row => row.x === x); return active && row ? <SketchTooltip><div>{row.label}</div>{keys.map((item, index) => <div key={item.id}>{item.label}: {row.values[index] === null ? 'Unavailable' : valueFormatter(row.values[index]!)} {unitLabel}</div>)}</SketchTooltip> : null; }} />
        {keys.map((item, index) => <Line key={item.id} id={`${id}-${index}`} dataKey={(row: Row) => row.values[index]} name={item.label} type="linear" connectNulls={false} fill="none" stroke={item.paint} strokeWidth="var(--nx-stroke-mark)" activeDot={false} {...motion}
          shape={(props: LineDrawShapeProps) => <Stroke {...props} settings={settings} seriesId={item.id} paint={item.paint} rows={rows} />}
          dot={(value: unknown) => <Dot value={value} settings={settings} seriesId={item.id} paint={item.paint} />} />)}
      </LineChart></ResponsiveContainer>
    </SketchPlot>}
  </SketchFrame>;
}
