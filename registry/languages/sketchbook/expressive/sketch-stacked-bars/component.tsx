'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { useSketchSettings, type SketchSettings } from '../../../../_shared/sketch/use-sketch-settings';
import { SketchRectangle } from '../../../../_shared/sketch/marks';
import { sketchSeed, uniqueIds, nonnegative, type SketchTone } from '../../../../_shared/sketch/identity';
import { SketchFrame, SketchPlot, SketchStatus, SketchTooltip, SketchKey, sketchTick, sketchFocus, compactNumber, formatNumber, type SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchStackedBarsSeries { id: string; label: string; tone?: SketchTone }
export interface SketchStackedBarsDatum { id: string; label: string; values: Readonly<Record<string, number | null>> }
export interface SketchStackedBarsProps extends SketchPresentationProps { data: readonly SketchStackedBarsDatum[]; series: readonly SketchStackedBarsSeries[] }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };
interface Row { id: string; label: string; index: number; values: (number | null)[]; total: number | null }
function Mark({ x, y, width, height, payload, settings, series, seriesIndex }: BarShapeProps & { settings: SketchSettings | null; series: { id: string; paint: string }; seriesIndex: number }) {
  const row = payload as Row;
  return row.total === null || !row.values[seriesIndex] ? null : <g data-nx-sketch-stack={row.id} data-nx-series={series.id} data-nx-value={row.values[seriesIndex]}>
    <SketchRectangle x={x} y={y} width={width} height={height} settings={settings} seed={sketchSeed(JSON.stringify([row.id, series.id]))} paint={series.paint} hatchWidth="var(--nx-sketch-fillWeight)" />
  </g>;
}
function Totals({ rows, format }: { rows: readonly Row[]; format: (value: number) => string }) {
  const x = useXAxisScale(); const y = useYAxisScale();
  return <g pointerEvents="none">{rows.map(row => <text key={row.id} data-nx-sketch-total={row.id} x={x?.(row.index, { position: 'middle' })} y={(y?.(row.total ?? 0) ?? 0) - 12} textAnchor="middle"
    fill="var(--nx-ink)" fontFamily="var(--nx-font-heading)" fontSize="var(--nx-type-plotValue-size)">{row.total === null ? '—' : format(row.total)}</text>)}</g>;
}
export function SketchStackedBars({ data, series, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber, width, height, animate = true, className = '', 'aria-label': label = 'Values by category and series' }: SketchStackedBarsProps) {
  const { ref, ...motion } = useChartMotion(animate); const settings = useSketchSettings(ref); const id = useId();
  const keys = useMemo(() => series.map(item => ({ ...item, paint: item.tone ? paints[item.tone] : Object.values(paints)[sketchSeed(item.id) % 9]! })), [series]);
  const rows = useMemo(() => data.map((row, index): Row => {
    const values = series.map(item => nonnegative(row.values[item.id])); const sum = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const total = values.every(value => value !== null) && Number.isFinite(sum) ? sum : null;
    return { id: row.id, label: row.label, index, total, values: total === null ? values.map(() => null) : values };
  }), [data, series]);
  const maximum = Math.max(0, ...rows.map(row => row.total ?? 0));
  const status = !series.length ? 'No series to compare.' : !data.length ? 'No categories to compare.' : !uniqueIds(data) || !uniqueIds(series) ? 'Categories and series each need unique, nonempty IDs.' : !rows.some(row => row.total !== null) ? 'No complete observations available.' : null;
  return <SketchFrame ref={ref} slug="sketch-stacked-bars" animated={motion.isAnimationActive} {...{ unitLabel, contextLabel, width, height, className }}>
    <SketchKey items={keys} />
    {status ? <SketchStatus>{status}</SketchStatus> : <SketchPlot height={height} minWidth={Math.max(340, rows.length * 96)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}><BarChart data={rows} accessibilityLayer title={label} className={sketchFocus}
        desc={`Segment heights show ${unitLabel}, stacked from zero. A category with any unavailable series has no stack. Use left and right arrows to inspect categories.`} margin={{ top: 32, right: 12, bottom: 8, left: 0 }} maxBarSize={82}>
        <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-axis)" />
        <XAxis dataKey="index" type="category" scale="band" interval={0} height={36} tick={sketchTick} tickFormatter={(index: number) => rows[index]?.label ?? ''} axisLine={false} tickLine={false} />
        <YAxis type="number" width={44} domain={[0, maximum || 1]} tick={sketchTick} tickFormatter={compactNumber} axisLine={false} tickLine={false} />
        <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => { const row = typeof index === 'number' ? rows[index] : undefined;
          return active && row ? <SketchTooltip><div>{row.label}</div>{row.total === null ? <div>Unavailable</div> : <>{keys.map((item, index) => <div key={item.id}>{item.label}: {valueFormatter(row.values[index]!)}</div>)}<div>Total: {valueFormatter(row.total)} {unitLabel}</div></>}</SketchTooltip> : null;
        }} />
        {keys.map((item, index) => <Bar key={item.id} id={`${id}-${index}`} dataKey={(row: Row) => row.values[index]} name={item.label} stackId={id} fill={item.paint} activeBar={false} {...motion}
          shape={(props: BarShapeProps) => <Mark {...props} settings={settings} series={item} seriesIndex={index} />} />)}
        <Totals rows={rows} format={valueFormatter} />
      </BarChart></ResponsiveContainer>
    </SketchPlot>}
  </SketchFrame>;
}
