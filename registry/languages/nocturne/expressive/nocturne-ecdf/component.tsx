'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Curve, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { scatterFade } from '../../../../_shared/scatter-fade';
import { nocturneTone, type NocturneTone } from '../../../../_shared/nocturne-categorical';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneEcdfSample { id: string; value: number | null }
export interface NocturneEcdfSeries { id: string; label: string; tone?: NocturneTone; samples: readonly NocturneEcdfSample[] }
export interface NocturneEcdfProps {
  data: readonly NocturneEcdfSeries[];
  /** Optional finite threshold; each key reports the measured share at or below it. */
  threshold?: number;
  /** Empirical inverse-CDF probabilities in (0, 1]; defaults to 0.5 and 0.9. */
  percentiles?: readonly number[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Group { value: number; count: number; cumulative: number }
interface Series { id: string; label: string; paint: string; n: number; missing: number; groups: Group[]; thresholdCount: number | null }
interface Point { id: string; series: Series; x: number; y: number; count: number; cumulative: number; previousX: number; previousY: number; last: boolean; end: number; opacity?: number }
const defaults = [0.5, 0.9];
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
const formatNumber = (value: number) => number.format(value);
const tones: Record<NocturneTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const matchObservation = matchByDataKey('id');
const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;

/** Each native observation owns its preceding step and, for the final value, its exact 100% tail. */
function CumulativeStep({ payload, cx, cy }: { payload?: Point; cx?: number; cy?: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const previousX = xScale(payload.previousX); const previousY = yScale(payload.previousY); const end = xScale(payload.end);
  if (previousX === undefined || previousY === undefined || end === undefined) return <g />;
  return <g data-nx-ecdf-step={payload.x} data-nx-ecdf-series={payload.series.id} opacity={payload.opacity ?? 1}>
    <Curve data-nx-ecdf-curve pointerEvents="none" points={[{ x: previousX, y: previousY }, { x: cx, y: cy }]} type="stepAfter" fill="none" stroke={payload.series.paint} strokeWidth="var(--nx-stroke-mark)" />
    {payload.last && <Curve data-nx-ecdf-tail pointerEvents="none" points={[{ x: cx, y: cy }, { x: end, y: cy }]} type="linear" fill="none" stroke={payload.series.paint} strokeWidth="var(--nx-stroke-mark)" />}
    <circle cx={cx} cy={cy} r={8} fill="transparent" />
    <circle data-nx-ecdf-point cx={cx} cy={cy} r={2.5} fill={payload.series.paint} />
  </g>;
}

/** Right-continuous empirical CDFs: ties jump together and each valid sample contributes 1/n. */
export function NocturneEcdf({ data, threshold, percentiles = defaults, unitLabel = 'Cumulative distribution', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Empirical cumulative distributions of supplied samples' }: NocturneEcdfProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { series, points, domain, validIds, validGuides } = useMemo(() => {
    const validIds = unique(data) && data.every(item => unique(item.samples));
    const validGuides = (threshold === undefined || Number.isFinite(threshold)) && percentiles.every(p => Number.isFinite(p) && p > 0 && p <= 1) && new Set(percentiles).size === percentiles.length;
    const series: Series[] = data.map(item => {
      const values = item.samples.flatMap(sample => sample.value !== null && Number.isFinite(sample.value) ? [sample.value] : []).sort((a, b) => a - b);
      const groups: Group[] = [];
      for (const value of values) {
        const previous = groups.at(-1);
        if (previous?.value === value) { previous.count++; previous.cumulative++; }
        else groups.push({ value, count: 1, cumulative: (previous?.cumulative ?? 0) + 1 });
      }
      return { id: item.id, label: item.label, paint: tones[nocturneTone(item.id, item.tone)], n: values.length, missing: item.samples.length - values.length, groups,
        thresholdCount: threshold === undefined ? null : values.filter(value => value <= threshold).length };
    });
    const domain = numericDomain([...series.flatMap(item => item.groups.map(group => group.value)), ...(threshold === undefined ? [] : [threshold])]);
    const points: Point[] = series.flatMap(item => item.groups.map((group, index) => ({ id: JSON.stringify([item.id, group.value]), series: item, x: group.value, y: group.cumulative / item.n,
      count: group.count, cumulative: group.cumulative, previousX: item.groups[index - 1]?.value ?? domain?.[0] ?? group.value,
      previousY: (item.groups[index - 1]?.cumulative ?? 0) / item.n, last: index === item.groups.length - 1, end: domain?.[1] ?? group.value })));
    return { series, points, domain, validIds, validGuides };
  }, [data, threshold, percentiles]);
  const status = !validIds ? 'Series and their samples each need unique, nonempty IDs.' : !validGuides ? 'Use a finite threshold and distinct percentile probabilities greater than zero and at most one.'
    : !domain ? 'The sample span is too large to display.' : !data.length ? 'No sample series supplied.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-ecdf" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 460, height: 276 }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 654, height: 276 }}>
            <ScatterChart accessibilityLayer title={label} desc="Height is the fraction of finite samples at or below the horizontal value. Ties form a single exact jump; the filled dot is the inclusive reading. Percentiles use the smallest observed value reaching their probability, without interpolation. Missing values are omitted and counted. Use left and right arrow keys to inspect observed values, in series order."
              margin={{ top: 14, right: 18, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
              <XAxis dataKey="x" type="number" domain={domain ?? [0, 1]} padding={{ left: 10, right: 10 }} height={34} tickCount={5} tickMargin={12} axisLine={false} tickLine={false} tickFormatter={value => compact.format(value)} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              <YAxis dataKey="y" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} padding={{ top: 10, bottom: 10 }} width={48} axisLine={false} tickLine={false} tickFormatter={value => percent.format(value)} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              {percentiles.map(p => <ReferenceLine key={p} y={p} stroke="var(--nx-border)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="3 5" />)}
              {threshold !== undefined && Number.isFinite(threshold) && <ReferenceLine x={threshold} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4" />}
              <Scatter id={id + '-steps'} data={points} fill="var(--nx-seriesA)" activeShape={false} shape={(props: unknown) => <CumulativeStep {...props as { payload?: Point; cx?: number; cy?: number }} />}
                {...motion} animationMatchBy={matchObservation} animationInterpolateFn={scatterFade} />
              <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
                const point = payload?.[0]?.payload as Point | undefined;
                return active && point ? <NocturneChartTooltip title={point.series.label}>
                  <div>At or below {valueFormatter(point.x)}: {percent.format(point.y)}</div>
                  <div>{point.cumulative} of {point.series.n} measured samples</div><div>{point.count} at this value</div>
                  {point.series.missing > 0 && <div>{point.series.missing} unavailable samples omitted</div>}
                </NocturneChartTooltip> : null;
              }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      {threshold !== undefined && Number.isFinite(threshold) && <p className="mt-3 mb-0 break-words text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">Threshold · {valueFormatter(threshold)}</p>}
      <ul className="mt-4 mb-0 flex list-none flex-wrap gap-x-8 gap-y-4 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] p-0 pt-4" aria-label="Sample counts and empirical percentiles">
        {series.map(item => <li key={item.id} data-nx-ecdf-key={item.id} className="min-w-0">
          <div className="flex items-center gap-2 text-[length:var(--nx-type-legend-size)]"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: item.paint }} /><span className="break-words">{item.label}</span><span data-nx-ecdf-n className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">n={item.n}</span></div>
          {threshold !== undefined && <div data-nx-ecdf-share className="mt-1 break-words text-[length:var(--nx-type-plotValue-size)] tabular-nums">{item.n ? percent.format(item.thresholdCount! / item.n) + ' at or below' : 'Unavailable'}</div>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)] tabular-nums">{percentiles.map(p => {
            const group = item.groups.find(group => group.cumulative / item.n >= p);
            return <span key={p} data-nx-ecdf-quantile={p}>P{number.format(p * 100)}: {group ? valueFormatter(group.value) : '—'}</span>;
          })}</div>
          {item.missing > 0 && <div data-nx-ecdf-omitted className="mt-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{item.missing} unavailable omitted</div>}
        </li>)}
      </ul>
      {!points.length && <p role="status" className="mt-3 mb-0 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">No finite samples available.</p>}
    </div>
  </NocturneChartFrame>;
}
