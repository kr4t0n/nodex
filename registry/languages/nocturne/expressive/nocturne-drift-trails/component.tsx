'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { scatterFade } from '../../../../_shared/scatter-fade';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { nocturneTone, type NocturneTone } from '../../../../_shared/nocturne-categorical';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneDriftObservation { id: string; label: string; time: number; x: number | null; y: number | null }
export interface NocturneDriftSeries { id: string; label: string; tone?: NocturneTone; observations: readonly NocturneDriftObservation[] }
export interface NocturneDriftTrailsProps {
  data: readonly NocturneDriftSeries[];
  unitLabel?: string; contextLabel?: string; xLabel?: string; yLabel?: string;
  xFormatter?: (value: number) => string; yFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Position { x: number; y: number }
interface Point extends Position { id: string; observationId: string; label: string; seriesId: string; seriesLabel: string; paint: string; previous: Position | null; latest: boolean; opacity?: number }
const tones: Record<NocturneTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => number.format(value);
const matchObservation = matchByDataKey('id');
const position = (value: NocturneDriftObservation | undefined): Position | null => value && value.x !== null && value.y !== null && Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: value.x, y: value.y } : null;

function TrailPoint({ payload, cx, cy }: { payload?: Point; cx?: number; cy?: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const px = payload.previous ? xScale(payload.previous.x) : undefined;
  const py = payload.previous ? yScale(payload.previous.y) : undefined;
  const connected = px !== undefined && py !== undefined;
  const length = connected ? Math.hypot(cx - px, cy - py) : 0;
  const angle = connected ? Math.atan2(cy - py, cx - px) * 180 / Math.PI : 0;
  return <g data-nx-drift-observation={payload.observationId} data-nx-drift-series={payload.seriesId} opacity={payload.opacity ?? 1}>
    {connected && <>
      <Curve data-nx-drift-segment={payload.observationId} points={[{ x: px, y: py }, { x: cx, y: cy }]} type="linear" fill="none" stroke={payload.paint} strokeWidth="var(--nx-stroke-hairline)" />
      {length >= 20 && <path data-nx-drift-direction d="M-4,-3L0,0L-4,3" transform={'translate(' + ((px + cx) / 2) + ' ' + ((py + cy) / 2) + ') rotate(' + angle + ')'} fill="none" stroke={payload.paint} strokeWidth="var(--nx-stroke-hairline)" />}
    </>}
    <circle cx={cx} cy={cy} r={9} fill="transparent" />
    <circle data-nx-drift-point={payload.observationId} data-nx-latest={payload.latest} cx={cx} cy={cy} r={payload.latest ? 5 : 2.5}
      fill={payload.latest ? payload.paint : 'var(--nx-surfaceFill)'} stroke={payload.paint} strokeWidth="var(--nx-stroke-hairline)" />
  </g>;
}

/** Native positions follow caller time order, including reversals and independent missing-coordinate gaps. */
export function NocturneDriftTrails({ data, unitLabel = 'Trajectories', contextLabel, xLabel = 'X', yLabel = 'Y', xFormatter = formatNumber, yFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Changes in two numeric measures over time' }: NocturneDriftTrailsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { points, keys, xDomain, yDomain, validIds, validTime } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    const validIds = unique(data) && data.every(series => unique(series.observations));
    const validTime = data.every(series => series.observations.every((point, index) => Number.isFinite(point.time) && (!index || point.time > series.observations[index - 1]!.time)));
    const keys = data.map(series => ({ id: series.id, label: series.label, paint: tones[nocturneTone(series.id, series.tone)],
      latest: position(series.observations.at(-1)), latestLabel: series.observations.at(-1)?.label,
      missing: series.observations.filter(point => !position(point)).length }));
    const points: Point[] = data.flatMap((series, seriesIndex) => series.observations.flatMap((observation, index): Point[] => {
      const coordinates = position(observation);
      return coordinates ? [{ ...coordinates, id: JSON.stringify([series.id, observation.id]), observationId: observation.id, label: observation.label,
        seriesId: series.id, seriesLabel: series.label, paint: keys[seriesIndex]!.paint, previous: position(series.observations[index - 1]), latest: index === series.observations.length - 1 }] : [];
    }));
    return { points, keys, validIds, validTime, xDomain: numericDomain(points.map(point => point.x)), yDomain: numericDomain(points.map(point => point.y)) };
  }, [data]);
  const status = !validIds ? 'Series and their observations each need unique, nonempty IDs.' : !validTime ? 'Observation times must be finite and strictly increasing within each series.'
    : !xDomain || !yDomain ? 'The coordinate span is too large to display.' : !points.length ? 'No complete positions available.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-drift-trails" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div className="overflow-x-auto">
      <div style={{ minWidth: 440, height: 280 }}>
        <div className="truncate pl-[52px] text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]" title={yLabel}>{yLabel}</div>
        <ResponsiveContainer width="100%" height={236} initialDimension={{ width: 704, height: 236 }}>
          <ScatterChart accessibilityLayer title={label} desc={'Horizontal position shows ' + xLabel + ', vertical position ' + yLabel + '. Arrows follow strictly increasing observation times; either numeric measure may reverse. Open dots are history, filled dots the final supplied observation. Missing coordinates break the trail and cannot become the latest reading. Use left and right arrow keys to inspect observations in series and time order.'}
            margin={{ top: 16, right: 20, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
            <XAxis dataKey="x" type="number" domain={xDomain ?? [0, 1]} padding={{ left: 12, right: 12 }} height={32} tickCount={5} tickMargin={10} tickFormatter={xFormatter} axisLine={false} tickLine={false} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <YAxis dataKey="y" type="number" domain={yDomain ?? [0, 1]} padding={{ top: 12, bottom: 12 }} width={52} tickCount={4} tickMargin={8} tickFormatter={yFormatter} axisLine={false} tickLine={false} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined;
              return active && point ? <NocturneChartTooltip title={point.seriesLabel + ' · ' + point.label}>
                <div>{xLabel}: {xFormatter(point.x)}</div><div>{yLabel}: {yFormatter(point.y)}</div>
                <div>{point.latest ? 'Latest supplied position' : 'Earlier observation'}</div>
              </NocturneChartTooltip> : null;
            }} />
            <Scatter id={id + '-positions'} data={points} fill="var(--nx-seriesA)" activeShape={false} shape={(props: unknown) => <TrailPoint {...props as { payload?: Point; cx?: number; cy?: number }} />} {...motion} animationMatchBy={matchObservation} animationInterpolateFn={scatterFade} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="truncate pl-[52px] text-center text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]" title={xLabel}>{xLabel}</div>
      </div>
      </div>
    <ul aria-label="Latest supplied positions" className="mt-4 mb-0 flex shrink-0 list-none flex-wrap gap-x-8 gap-y-3 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] px-0 pt-4">
      {keys.map(series => <li key={series.id} data-nx-drift-key={series.id} className="min-w-0">
        <div className="flex items-center gap-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: series.paint }} /><span className="break-words">{series.label}</span></div>
        <div data-nx-drift-latest={series.id} className="mt-1 break-all text-[length:var(--nx-type-plotValue-size)] tabular-nums">{series.latest ? xFormatter(series.latest.x) + ' / ' + yFormatter(series.latest.y) : '—'}</div>
        <div className="mt-1 break-words text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{series.latestLabel ?? 'No observations'}{series.missing ? ' · ' + series.missing + ' unavailable' : ''}</div>
      </li>)}
    </ul>
    <p className="mt-3 mb-0 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">Arrows follow time · Filled dots: latest supplied position</p>
    </div>
  </NocturneChartFrame>;
}
