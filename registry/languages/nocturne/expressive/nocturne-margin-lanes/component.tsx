'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, usePlotArea, useXAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { scatterFade } from '../../../../_shared/scatter-fade';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneMarginDatum {
  id: string; label: string; target: number | null; value: number | null;
  /** Caller-supplied expected interval, in the same units as the current value and target. */
  range: readonly [low: number, high: number] | null;
}
export interface NocturneMarginLanesProps {
  data: readonly NocturneMarginDatum[];
  unitLabel?: string; contextLabel?: string;
  valueFormatter?: (value: number) => string; deltaFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Lane extends NocturneMarginDatum { index: number; x: number; deviation: number | null; interval: [number, number] | null; opacity?: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => number.format(value);
const formatDelta = (value: number) => (value > 0 ? '+' : '') + number.format(value);
const clean = (value: number | null) => value !== null && Number.isFinite(value) ? value : null;
const matchLane = matchByDataKey('id');

function IntervalDot({ payload, cy, format }: { payload?: Lane; cy?: number; format: (value: number) => string }) {
  const scale = useXAxisScale(); const plot = usePlotArea();
  if (!payload || cy === undefined || !scale || !plot) return <g />;
  const low = payload.interval ? scale(payload.interval[0]) : undefined;
  const high = payload.interval ? scale(payload.interval[1]) : undefined;
  const value = payload.deviation === null ? undefined : scale(payload.deviation);
  return <g data-nx-margin-lane={payload.id} opacity={payload.opacity ?? 1}>
    <rect x={0} y={cy - 21} width={plot.x + plot.width + 84} height={42} fill="transparent" />
    <foreignObject x={0} y={cy - 12} width={plot.x - 16} height={24}>
      <div className="flex h-full items-center text-[length:var(--nx-type-legend-size)] text-[var(--nx-ink)]"><span className="truncate" title={payload.label}>{payload.label}</span></div>
    </foreignObject>
    {low !== undefined && high !== undefined && <g data-nx-margin-range={payload.id}>
      {high > low && <rect x={low} y={cy - 5} width={high - low} height={10} fill="var(--nx-seriesA)" fillOpacity={0.18} style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }} />}
      <line x1={low} x2={high} y1={cy} y2={cy} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" />
      <line data-nx-margin-low x1={low} x2={low} y1={cy - 6} y2={cy + 6} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" />
      {low !== high && <line data-nx-margin-high x1={high} x2={high} y1={cy - 6} y2={cy + 6} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" />}
    </g>}
    {value !== undefined && <circle data-nx-margin-current={payload.id} cx={value} cy={cy} r={4.5} fill="var(--nx-seriesA)" stroke="var(--nx-surfaceFill)" strokeWidth="var(--nx-stroke-hairline)" />}
    {value === undefined && low === undefined && <text x={plot.x + 6} y={cy} dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-caption-size)">Unavailable</text>}
    <foreignObject x={plot.x + plot.width + 12} y={cy - 12} width={68} height={24}>
      <div className="flex h-full items-center justify-end text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] text-[var(--nx-ink)] tabular-nums">
        <span data-nx-margin-reading={payload.id} title={payload.deviation === null ? 'Unavailable' : format(payload.deviation)} className="truncate">{payload.deviation === null ? '—' : format(payload.deviation)}</span>
      </div>
    </foreignObject>
  </g>;
}

/** Each row subtracts its own target; dots and expected intervals use one common signed unit. */
export function NocturneMarginLanes({ data, unitLabel = 'Deviation from target', contextLabel, valueFormatter = formatNumber, deltaFormatter = formatDelta,
  width, height, animate = true, className, 'aria-label': label = 'Current values and expected ranges relative to targets' }: NocturneMarginLanesProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { lanes, extent, valid } = useMemo(() => {
    const valid = data.every(row => row.id.trim()) && new Set(data.map(row => row.id)).size === data.length;
    const lanes: Lane[] = data.map((row, index) => {
      const target = clean(row.target); const value = clean(row.value);
      const deviation = target !== null && value !== null ? clean(value - target) : null;
      const range = row.range?.length === 2 && row.range.every(Number.isFinite) && row.range[0] <= row.range[1] ? row.range : null;
      const shifted: [number, number] | null = target !== null && range ? [range[0] - target, range[1] - target] : null;
      const interval = shifted?.every(Number.isFinite) ? shifted : null;
      return { id: row.id, label: row.label, index, target, value, range, deviation, interval, x: deviation ?? interval?.[0] ?? 0 };
    });
    const extent = lanes.reduce((maximum, row) => Math.max(maximum, Math.abs(row.deviation ?? 0), ...((row.interval ?? []).map(Math.abs))), 0) || 1;
    return { lanes, extent, valid };
  }, [data]);
  const status = !valid ? 'Each lane needs a unique, nonempty ID.' : !Number.isFinite(extent * 2) ? 'The deviation span is too large to display.' : !lanes.length ? 'No targets to compare.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-margin-lanes" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div style={{ minWidth: 460, height: Math.max(190, lanes.length * 46 + 48) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 704, height: 278 }}>
          <ScatterChart accessibilityLayer title={label} desc="Each dot is current value minus its row's target. Capped intervals are caller-supplied expected ranges minus the same target. All rows use one common unit and symmetric scale. The central line is zero deviation; negative means below target, positive above. Color does not classify outcomes. Use left and right arrow keys to inspect rows."
            margin={{ top: 16, right: 88, bottom: 0, left: 128 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
            <XAxis dataKey="x" type="number" domain={[-extent, extent]} padding={{ left: 8, right: 8 }} height={32} tickCount={5} tickMargin={10} tickFormatter={deltaFormatter} axisLine={false} tickLine={false} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="index" type="number" reversed domain={[-0.5, lanes.length - 0.5]} hide />
            <ReferenceLine x={0} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="3 4" />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Lane | undefined;
              return active && row ? <NocturneChartTooltip title={row.label}>
                <div>Target: {row.target === null ? 'Unavailable' : valueFormatter(row.target)}</div>
                <div>Current: {row.value === null ? 'Unavailable' : valueFormatter(row.value)}</div>
                <div>Expected: {row.range ? row.range.map(valueFormatter).join(' → ') : 'Unavailable'}</div>
                <div>Deviation: {row.deviation === null ? 'Unavailable' : deltaFormatter(row.deviation)}</div>
              </NocturneChartTooltip> : null;
            }} />
            <Scatter id={id + '-lanes'} data={lanes} fill="var(--nx-seriesA)" activeShape={false} shape={(props: unknown) => <IntervalDot {...props as { payload?: Lane; cy?: number }} format={deltaFormatter} />} {...motion} animationMatchBy={matchLane} animationInterpolateFn={scatterFade} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="mt-4 flex shrink-0 flex-wrap justify-between gap-3 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span>Band: expected range · Dot: current</span><span>− below target · + above target</span>
    </div>
  </NocturneChartFrame>;
}
