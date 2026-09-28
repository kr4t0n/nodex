'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, usePlotArea, useXAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { scatterFade } from '../../../../_shared/scatter-fade';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export type NocturneBoxSummary = readonly [lowerWhisker: number, q1: number, median: number, q3: number, upperWhisker: number];
export interface NocturneBoxOutlier { id: string; label?: string; value: number | null }
export interface NocturneBoxDatum {
  id: string; label: string;
  /** Caller-computed, finite, ordered statistics. Whisker policy and quartiles are not inferred. */
  summary: NocturneBoxSummary | null;
  outliers?: readonly NocturneBoxOutlier[];
}
export interface NocturneBoxplotProps {
  data: readonly NocturneBoxDatum[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row { id: string; label: string; index: number; summary: NocturneBoxSummary | null; outliers: NocturneBoxOutlier[] }
interface Observation { id: string; row: Row; index: number; x: number; kind: 'summary' | 'outlier'; outlier?: NocturneBoxOutlier; opacity?: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);
const matchObservation = matchByDataKey('id');

function DistributionMark({ payload, cx, cy, format }: { payload?: Observation; cx?: number; cy?: number; format: (value: number) => string }) {
  const scale = useXAxisScale(); const plot = usePlotArea();
  if (!payload || cx === undefined || cy === undefined || !scale || !plot) return <g />;
  const { row } = payload;
  if (payload.kind === 'outlier') return <g data-nx-box-outlier={payload.outlier!.id} data-nx-box-owner={row.id} opacity={payload.opacity ?? 1}>
    <circle cx={cx} cy={cy} r={9} fill="transparent" />
    <circle data-nx-box-dot cx={cx} cy={cy} r={3} fill="var(--nx-seriesC)" />
  </g>;
  const positions = row.summary?.map(value => scale(value));
  const [low, q1, median, q3, high] = positions ?? [];
  const reading = row.summary ? format(row.summary[2]) : 'Unavailable';
  return <g data-nx-box-row={row.id} opacity={payload.opacity ?? 1}>
    <rect x={0} y={cy - 21} width={plot.x + plot.width + 84} height={42} fill="transparent" />
    <foreignObject x={0} y={cy - 12} width={plot.x - 16} height={24}>
      <div className="flex h-full items-center text-[length:var(--nx-type-legend-size)] text-[var(--nx-ink)]"><span className="truncate" title={row.label}>{row.label}</span></div>
    </foreignObject>
    {low !== undefined && q1 !== undefined && median !== undefined && q3 !== undefined && high !== undefined && <g data-nx-box-summary={row.id}>
      <line data-nx-box-whisker x1={low} x2={high} y1={cy} y2={cy} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" />
      <line data-nx-box-low x1={low} x2={low} y1={cy - 6} y2={cy + 6} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" />
      {low !== high && <line data-nx-box-high x1={high} x2={high} y1={cy - 6} y2={cy + 6} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" />}
      {q3 > q1 && <rect data-nx-box-iqr x={q1} y={cy - 10} width={q3 - q1} height={20} fill="var(--nx-seriesA)" fillOpacity={0.22} stroke="var(--nx-seriesA)" strokeWidth="var(--nx-stroke-hairline)" style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }} />}
      <line data-nx-box-median x1={median} x2={median} y1={cy - 10} y2={cy + 10} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" />
    </g>}
    <foreignObject x={plot.x + plot.width + 12} y={cy - 12} width={68} height={24}>
      <div className="flex h-full items-center justify-end text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] text-[var(--nx-ink)] tabular-nums">
        <span data-nx-box-reading={row.id} title={reading} className="truncate">{row.summary ? reading : '—'}</span>
      </div>
    </foreignObject>
  </g>;
}

/** Supplied five-number summaries and independent outliers on a common signed scale. */
export function NocturneBoxplot({ data, unitLabel = 'Distribution', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Distributions with quartiles, medians, whiskers and outliers' }: NocturneBoxplotProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, observations, domain, valid, omitted } = useMemo(() => {
    const valid = data.every(row => row.id.trim() && (row.outliers ?? []).every(point => point.id.trim()) && new Set((row.outliers ?? []).map(point => point.id)).size === (row.outliers ?? []).length)
      && new Set(data.map(row => row.id)).size === data.length;
    let omitted = 0;
    const rows: Row[] = data.map((row, index) => {
      const summary = row.summary?.length === 5 && row.summary.every((value, i, values) => Number.isFinite(value) && (i === 0 || value >= values[i - 1]!)) ? row.summary : null;
      const outliers = (row.outliers ?? []).filter(point => point.value !== null && Number.isFinite(point.value));
      omitted += (row.outliers?.length ?? 0) - outliers.length;
      return { id: row.id, label: row.label, index, summary, outliers };
    });
    const domain = numericDomain(rows.flatMap(row => [...(row.summary ?? []), ...row.outliers.map(point => point.value!)]));
    const observations: Observation[] = rows.flatMap(row => [
      { id: JSON.stringify([row.id, 'summary']), row, index: row.index, x: row.summary?.[2] ?? domain?.[0] ?? 0, kind: 'summary' as const },
      ...row.outliers.map(outlier => ({ id: JSON.stringify([row.id, 'outlier', outlier.id]), row, index: row.index, x: outlier.value!, kind: 'outlier' as const, outlier })),
    ]);
    return { rows, observations, domain, valid, omitted };
  }, [data]);
  const status = !valid ? 'Each row and each of its outliers need unique, nonempty IDs.' : !domain ? 'The distribution span is too large to display.' : !rows.length ? 'No distributions supplied.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-boxplot" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 500, height: Math.max(190, rows.length * 46 + 62) }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 654, height: 292 }}>
            <ScatterChart accessibilityLayer title={label} desc="Boxes span supplied first to third quartiles; the bright tick is the median, also read at right. Capped whiskers use supplied bounds. Dots are caller-classified outliers, independent of summary availability. No quartile method or outlier threshold is inferred. Use left and right arrow keys to inspect each summary and outlier."
              margin={{ top: 24, right: 88, bottom: 0, left: 124 }}
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
              <XAxis dataKey="x" type="number" domain={domain ?? [0, 1]} padding={{ left: 10, right: 10 }} height={32} tickCount={5} tickMargin={10} tickFormatter={value => compact.format(value)} axisLine={false} tickLine={false} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              <YAxis dataKey="index" type="number" reversed domain={[-0.5, rows.length - 0.5]} hide />
              <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
                const observation = payload?.[0]?.payload as Observation | undefined;
                if (!active || !observation) return null;
                const summary = observation.row.summary;
                return <NocturneChartTooltip title={observation.row.label}>
                  {observation.kind === 'outlier' ? <div>{observation.outlier!.label ?? 'Outlier'}: {valueFormatter(observation.x)}</div>
                    : summary ? <><div>Median: {valueFormatter(summary[2])}</div><div>Middle 50%: {valueFormatter(summary[1])} → {valueFormatter(summary[3])}</div><div>Whiskers: {valueFormatter(summary[0])} → {valueFormatter(summary[4])}</div></>
                      : <div>Summary unavailable</div>}
                </NocturneChartTooltip>;
              }} />
              <Scatter id={id + '-distributions'} data={observations} fill="var(--nx-seriesA)" activeShape={false}
                shape={(props: unknown) => <DistributionMark {...props as { payload?: Observation; cx?: number; cy?: number }} format={valueFormatter} />}
                {...motion} animationMatchBy={matchObservation} animationInterpolateFn={scatterFade} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-3 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
        <span>Box: middle 50% · Tick: median · Dots: outliers</span><span>Readings: median</span>
        {omitted > 0 && <span data-nx-box-omitted>{omitted} unavailable outlier{omitted === 1 ? '' : 's'} omitted</span>}
      </div>
    </div>
  </NocturneChartFrame>;
}
