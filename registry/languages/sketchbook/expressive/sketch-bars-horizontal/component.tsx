'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { useSketchSettings, type SketchSettings } from '../../../../_shared/sketch/use-sketch-settings';
import { SketchRectangle } from '../../../../_shared/sketch/marks';
import { sketchSeed, uniqueIds, nonnegative, type SketchTone } from '../../../../_shared/sketch/identity';
import { SketchFrame, SketchPlot, SketchStatus, SketchTooltip, sketchTick, sketchFocus, compactNumber, formatNumber, type SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchBarsHorizontalDatum { id: string; label: string; value: number | null; tone?: SketchTone }
export interface SketchBarsHorizontalProps extends SketchPresentationProps { data: readonly SketchBarsHorizontalDatum[] }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };
interface Row extends SketchBarsHorizontalDatum { index: number; paint: string }
function Mark({ x, y, width, height, payload, settings }: BarShapeProps & { settings: SketchSettings | null }) {
  const row = payload as Row;
  return row.value === null || row.value === 0 ? null : <g data-nx-horizontal-bar={row.id}>
    <SketchRectangle x={x} y={y} width={width} height={height} settings={settings} seed={sketchSeed(row.id)} paint={row.paint} hatchWidth="var(--nx-sketch-fillWeight)" />
  </g>;
}
function Values({ rows, format }: { rows: readonly Row[]; format: (value: number) => string }) {
  const x = useXAxisScale(); const y = useYAxisScale();
  return <g pointerEvents="none">{rows.map(row => <text key={row.id} x={(x?.(row.value ?? 0) ?? 0) + 10} y={y?.(row.index, { position: 'middle' })} dominantBaseline="central"
    fill="var(--nx-ink)" fontFamily="var(--nx-font-heading)" fontSize="var(--nx-type-plotValue-size)" data-nx-horizontal-value={row.id}>{row.value === null ? '—' : format(row.value)}</text>)}</g>;
}
export function SketchBarsHorizontal({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber, width, height, animate = true, className = '', 'aria-label': label = 'Values by category' }: SketchBarsHorizontalProps) {
  const { ref, ...motion } = useChartMotion(animate); const settings = useSketchSettings(ref); const id = useId();
  const rows = useMemo(() => data.map((row, index): Row => ({ ...row, index, value: nonnegative(row.value), paint: row.tone ? paints[row.tone] : Object.values(paints)[sketchSeed(row.id) % 9]! })), [data]);
  const maximum = Math.max(0, ...rows.map(row => row.value ?? 0));
  const status = !rows.length ? 'No categories to compare.' : !uniqueIds(data) ? 'Each category needs a unique, nonempty ID.' : !rows.some(row => row.value !== null) ? 'No observations available.' : null;
  return <SketchFrame ref={ref} slug="sketch-bars-horizontal" animated={motion.isAnimationActive} {...{ unitLabel, contextLabel, width, height, className }}>
    {status ? <SketchStatus>{status}</SketchStatus> : <SketchPlot height={height} minWidth={480} plotHeight={Math.max(280, rows.length * 56 + 44)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 300 }}><BarChart data={rows} layout="vertical" accessibilityLayer title={label}
        desc={`Width shows ${unitLabel} from zero, in caller order. A dash means unavailable. Use left and right arrows to inspect categories.`} className={sketchFocus} margin={{ top: 8, right: 88, bottom: 8, left: 0 }} maxBarSize={32}>
        <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-axis)" />
        <XAxis type="number" domain={[0, maximum || 1]} tick={sketchTick} tickFormatter={compactNumber} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="index" scale="band" width={116} interval={0} tick={sketchTick} tickFormatter={(index: number) => rows[index]?.label ?? ''} axisLine={false} tickLine={false} />
        <Tooltip cursor={false} filterNull={false} isAnimationActive={false} content={({ active, label: index }) => { const row = typeof index === 'number' ? rows[index] : undefined; return active && row ? <SketchTooltip><div>{row.label}</div><div>{row.value === null ? 'Unavailable' : `${valueFormatter(row.value)} ${unitLabel}`}</div></SketchTooltip> : null; }} />
        <Bar id={id} dataKey="value" fill="var(--nx-ink)" activeBar={false} shape={(props: BarShapeProps) => <Mark {...props} settings={settings} />} {...motion} />
        <Values rows={rows} format={valueFormatter} />
      </BarChart></ResponsiveContainer>
    </SketchPlot>}
  </SketchFrame>;
}
