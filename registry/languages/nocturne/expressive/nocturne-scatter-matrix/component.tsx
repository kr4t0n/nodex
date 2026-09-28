'use client';

import { Fragment, createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, useXAxisScale, type AnimationInterpolateFn, type BarRectangleItem, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { scatterFade } from '../../../../_shared/scatter-fade';
import { nocturneTone, type NocturneTone } from '../../../../_shared/nocturne-categorical';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export interface NocturneMatrixDimension { id: string; label: string; unit?: string; valueFormatter?: (value: number) => string }
export interface NocturneMatrixCohort { id: string; label: string; tone?: NocturneTone }
export interface NocturneMatrixDatum { id: string; label: string; cohortId: string; values: Readonly<Record<string, number | null>> }
export interface NocturneScatterMatrixProps {
  data: readonly NocturneMatrixDatum[];
  dimensions: readonly NocturneMatrixDimension[];
  cohorts: readonly NocturneMatrixCohort[];
  /** Equal-width bins per dimension, shared by all cohorts; integer from 2 to 24. */
  binCount?: number;
  unitLabel?: string; contextLabel?: string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Cohort extends NocturneMatrixCohort { paint: string; n: number }
interface Bin { id: string; from: number; to: number; center: number; last: boolean; counts: number[]; members: string[][]; opacity?: number }
interface Dimension extends NocturneMatrixDimension { domain: [number, number]; bins: Bin[]; n: number; maxCount: number }
interface Point { id: string; label: string; x: number; y: number; cohort: Cohort; opacity?: number }
interface Selection { cell: string; observation: string | null }
type Inspect = (cell: string, observation: string | null, active: boolean) => void;
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const tones: Record<NocturneTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
const finite = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
const reading = (dimension: NocturneMatrixDimension, value: number) => (dimension.valueFormatter?.(value) ?? number.format(value)) + (dimension.unit ? ' ' + dimension.unit : '');
const matchObservation = matchByDataKey('id');
const fadeBins: AnimationInterpolateFn<BarRectangleItem, 'horizontal' | 'vertical'> = (items, progress) =>
  (items ?? []).flatMap(item => item.status === 'removed' ? [] : [{ ...item.next, payload: { ...item.next.payload, opacity: progress } }]);
const focusClass = '[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]';
const tick = { fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' };
const SelectedObservation = createContext<string | null>(null);
const InspectObservation = createContext<Inspect>(() => {});

/** Hover changes mark paint through context without replacing native series props or restarting their animation. */
function InspectionRegion({ data, constrained, children }: { data: readonly NocturneMatrixDatum[]; constrained: boolean; children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const onInspect = useCallback<Inspect>((cell, observation, active) => setSelection(current => active
    ? current?.cell === cell && current.observation === observation ? current : { cell, observation }
    : current?.cell === cell ? null : current), []);
  const selected = selection?.observation && data.some(row => row.id === selection.observation) ? selection.observation : null;
  return <InspectObservation value={onInspect}><SelectedObservation value={selected}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (constrained ? 'min-h-0 flex-1' : '')}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSelection(null); }} onMouseLeave={() => setSelection(null)}
      onKeyDownCapture={event => { if (event.key === 'Escape') setSelection(null); }}>
      {children}
    </div>
  </SelectedObservation></InspectObservation>;
}

/** Native tooltip activity owns inspection; linking only changes the other panels' marks. */
function LinkedTooltip({ active, cell, observation, children }: { active: boolean; cell: string; observation: string | null; children: ReactNode }) {
  const onInspect = useContext(InspectObservation);
  useEffect(() => {
    onInspect(cell, observation, active);
    return () => onInspect(cell, observation, false);
  }, [active, cell, observation, onInspect]);
  return active ? children : null;
}

// A stable element type matters: an inline content function remounts on linked updates.
function MatrixTooltip({ active, payload, cell, horizontal, vertical, groups }: {
  active?: boolean; payload?: readonly { payload?: unknown }[]; cell: string; horizontal: Dimension; vertical: Dimension; groups: Cohort[];
}) {
  const diagonal = horizontal.id === vertical.id;
  const bin = diagonal ? payload?.[0]?.payload as Bin | undefined : undefined;
  const point = diagonal ? undefined : payload?.[0]?.payload as Point | undefined;
  return <LinkedTooltip active={!!active && !!(point ?? bin)} cell={cell} observation={point?.id ?? null}>
    {bin ? <NocturneChartTooltip title={horizontal.label}><div>{reading(horizontal, bin.from)} ≤ value {bin.last ? '≤' : '<'} {reading(horizontal, bin.to)}</div>
      {groups.map((cohort, i) => <div key={cohort.id}>{cohort.label}: {bin.counts[i]}</div>)}
    </NocturneChartTooltip> : point ? <NocturneChartTooltip title={point.label}><div>{point.cohort.label}</div><div>{horizontal.label}: {reading(horizontal, point.x)}</div><div>{vertical.label}: {reading(vertical, point.y)}</div></NocturneChartTooltip> : null}
  </LinkedTooltip>;
}

function Observation({ payload, cx, cy }: { payload?: Point; cx?: number; cy?: number }) {
  const selected = useContext(SelectedObservation);
  if (!payload || cx === undefined || cy === undefined) return <g />;
  const highlighted = selected === payload.id;
  return <g opacity={payload.opacity ?? 1}>
    <circle cx={cx} cy={cy} r={7} fill="transparent" />
    <circle data-nx-matrix-point={payload.id} data-nx-cohort={payload.cohort.id} data-nx-selected={highlighted}
      cx={cx} cy={cy} r={highlighted ? 4 : 2.5} fill={payload.cohort.paint} fillOpacity={selected && !highlighted ? 0.2 : 0.8}
      stroke={highlighted ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-hairline)" />
  </g>;
}

/** Native bar heights encode counts. Public numeric X scales keep adjacent bins exact. */
function HistogramBin({ payload, y, height, cohort, cohortIndex }: Partial<BarShapeProps> & { cohort: Cohort; cohortIndex: number }) {
  const selected = useContext(SelectedObservation);
  const scale = useXAxisScale(); const bin = payload as Bin;
  if (!scale || !bin || y === undefined || height === undefined) return <g />;
  const left = scale(bin.from); const right = scale(bin.to);
  if (left === undefined || right === undefined || !bin.counts[cohortIndex]) return <g />;
  const highlighted = selected !== null && bin.members[cohortIndex]!.includes(selected);
  return <rect data-nx-matrix-bin={bin.id} data-nx-cohort={cohort.id} data-nx-count={bin.counts[cohortIndex]}
    data-nx-from={bin.from} data-nx-to={bin.to} data-nx-selected={highlighted}
    x={left} y={y} width={right - left} height={height} opacity={bin.opacity ?? 1}
    fill={cohort.paint} fillOpacity={highlighted ? 0.55 : 0.2} stroke={highlighted ? 'var(--nx-ink)' : cohort.paint} strokeWidth="var(--nx-stroke-hairline)" />;
}

/** Raw observations remain paired by ID; missing coordinates affect only their own pairs. */
export function NocturneScatterMatrix({ data, dimensions, cohorts, binCount = 6, unitLabel = 'Pairwise relationships', contextLabel,
  width, height, animate = true, className, 'aria-label': label = 'Scatterplot matrix with marginal histograms' }: NocturneScatterMatrixProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { groups, metrics, valid, validBins, validExtents } = useMemo(() => {
    const dimensionIds = new Set(dimensions.map(dimension => dimension.id));
    const cohortIds = new Set(cohorts.map(cohort => cohort.id));
    const valid = unique(data) && unique(dimensions) && unique(cohorts)
      && data.every(row => cohortIds.has(row.cohortId) && Object.keys(row.values).every(key => dimensionIds.has(key)));
    const validBins = Number.isInteger(binCount) && binCount >= 2 && binCount <= 24;
    const groups: Cohort[] = cohorts.map(cohort => ({ ...cohort, paint: tones[nocturneTone(cohort.id, cohort.tone)], n: data.filter(row => row.cohortId === cohort.id).length }));
    let validExtents = true;
    const metrics: Dimension[] = dimensions.map(dimension => {
      const values = data.flatMap(row => finite(row.values[dimension.id]) ? [row.values[dimension.id]!] : []);
      const extent = numericDomain(values);
      if (!extent) validExtents = false;
      const domain: [number, number] = extent ?? [0, 1];
      const edges = Array.from({ length: (validBins ? binCount : 6) + 1 }, (_, i) => domain[0] + (domain[1] - domain[0]) * (i / (validBins ? binCount : 6)));
      edges[edges.length - 1] = domain[1];
      if (edges.some((edge, i) => !Number.isFinite(edge) || i > 0 && edge <= edges[i - 1]!)) validExtents = false;
      const bins: Bin[] = edges.slice(0, -1).map((from, i) => {
        const to = edges[i + 1]!; const last = i === edges.length - 2;
        const members = groups.map(cohort => data.filter(row => row.cohortId === cohort.id && finite(row.values[dimension.id])
          && row.values[dimension.id]! >= from && (last ? row.values[dimension.id]! <= to : row.values[dimension.id]! < to)).map(row => row.id));
        return { id: JSON.stringify([dimension.id, from, to]), from, to, center: from + (to - from) / 2, last, counts: members.map(items => items.length), members };
      });
      return { ...dimension, domain, bins, n: values.length, maxCount: Math.max(1, ...bins.flatMap(bin => bin.counts)) };
    });
    return { groups, metrics, valid, validBins, validExtents };
  }, [data, dimensions, cohorts, binCount]);
  const pairs = useMemo(() => {
    const groupById = new Map(groups.map(group => [group.id, group]));
    return new Map(metrics.flatMap(vertical => metrics.map(horizontal => {
      const points: Point[] = horizontal.id === vertical.id ? [] : data.flatMap(row => {
        const x = row.values[horizontal.id]; const y = row.values[vertical.id]; const cohort = groupById.get(row.cohortId);
        return finite(x) && finite(y) && cohort ? [{ id: row.id, label: row.label, x, y, cohort }] : [];
      });
      return [JSON.stringify([horizontal.id, vertical.id]), points] as const;
    })));
  }, [data, metrics, groups]);
  const status = !valid ? 'Use unique, nonempty IDs and only declared dimensions and cohorts.' : dimensions.length < 2 ? 'Declare at least two dimensions.'
    : !cohorts.length ? 'Declare at least one cohort.' : !validBins ? 'Use an integer bin count from 2 to 24.'
      : !validExtents ? 'A dimension span cannot be divided into finite, distinct bins.' : !data.length ? 'No observations supplied.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-scatter-matrix" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <InspectionRegion data={data} constrained={height !== undefined}>
      <div className="overflow-x-auto">
        <div role="group" aria-label={label} className="grid" style={{ minWidth: 80 + metrics.length * 148, gridTemplateColumns: `80px repeat(${metrics.length}, minmax(0, 1fr))` }}>
          <div aria-hidden="true" />
          {metrics.map(metric => <div key={metric.id} className="min-w-0 px-2 pb-3 text-center text-[length:var(--nx-type-caption-size)]">
            <div className="truncate" title={metric.label}>{metric.label}</div><div className="truncate text-[var(--nx-muted)]" title={metric.unit}>{metric.unit ?? 'Value'}</div>
          </div>)}
          {metrics.map((vertical, rowIndex) => <Fragment key={vertical.id}>
            <div className="flex min-w-0 flex-col justify-center pr-2 text-[length:var(--nx-type-caption-size)]">
              <span className="truncate" title={vertical.label}>{vertical.label}</span><span className="truncate text-[var(--nx-muted)]" title={vertical.unit}>{vertical.unit ?? 'Value'}</span>
            </div>
            {metrics.map((horizontal, columnIndex) => {
              const diagonal = rowIndex === columnIndex; const cell = JSON.stringify([horizontal.id, vertical.id]);
              const points = pairs.get(cell)!;
              const count = diagonal ? horizontal.n : points.length;
              const title = diagonal ? horizontal.label + ' distribution' : vertical.label + ' by ' + horizontal.label;
              return <div key={horizontal.id} data-nx-matrix-cell={cell} data-nx-matrix-kind={diagonal ? 'histogram' : 'scatter'}
                className="relative min-w-0 border-t-[length:var(--nx-stroke-hairline)] border-l-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] py-2">
                <div data-nx-matrix-count className="flex min-w-0 justify-between gap-1 px-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)] tabular-nums">
                  <span>{diagonal ? 'Count' : 'Pairs'} · {count}</span>{count < data.length && <span title="Observations with an unavailable coordinate">{data.length - count} omitted</span>}
                </div>
                <div style={{ height: 122 }}>
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 156, height: 122 }}>
                    {diagonal ? <BarChart data={horizontal.bins} accessibilityLayer title={title} className={focusClass} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                      desc={'Overlaid cohort counts in ' + binCount + ' equal-width bins. Bins include their lower boundary; only the last includes its upper boundary. Use left and right arrows to inspect exact counts.'}>
                      <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 4" />
                      <XAxis dataKey="center" type="number" domain={horizontal.domain} padding={{ left: 4, right: 4 }} ticks={horizontal.domain} height={24} tickMargin={8} axisLine={false} tickLine={false} tick={tick} tickFormatter={value => compact.format(value)} />
                      <YAxis type="number" domain={[0, horizontal.maxCount]} ticks={[0, horizontal.maxCount]} width={34} axisLine={false} tickLine={false} tick={tick} />
                      {groups.map((cohort, cohortIndex) => <Bar key={cohort.id} id={id + '-hist-' + rowIndex + '-' + cohortIndex} dataKey={'counts.' + cohortIndex} name={cohort.label} fill={cohort.paint} activeBar={false}
                        shape={<HistogramBin cohort={cohort} cohortIndex={cohortIndex} />} {...motion} animationMatchBy={matchObservation} animationInterpolateFn={fadeBins} />)}
                      <Tooltip cursor={false} isAnimationActive={false} position={{ x: 0, y: 0 }} wrapperStyle={{ zIndex: 20, maxWidth: '100%', pointerEvents: 'none' }}
                        content={<MatrixTooltip cell={cell} horizontal={horizontal} vertical={vertical} groups={groups} />} />
                    </BarChart> : <ScatterChart accessibilityLayer title={title} className={focusClass} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                      desc={'Each dot is one observation with both coordinates. X: ' + horizontal.label + (horizontal.unit ? ' (' + horizontal.unit + ')' : '') + '. Y: ' + vertical.label + (vertical.unit ? ' (' + vertical.unit + ')' : '') + '. Color identifies cohort. Use left and right arrows to inspect observations and link their marks throughout the matrix.'}>
                      <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 4" />
                      <XAxis dataKey="x" type="number" domain={horizontal.domain} padding={{ left: 4, right: 4 }} ticks={horizontal.domain} height={24} tickMargin={8} axisLine={false} tickLine={false} tick={tick} tickFormatter={value => compact.format(value)} />
                      <YAxis dataKey="y" type="number" domain={vertical.domain} padding={{ top: 4, bottom: 4 }} ticks={vertical.domain} width={34} axisLine={false} tickLine={false} tick={tick} tickFormatter={value => compact.format(value)} />
                      <Scatter id={id + '-pair-' + rowIndex + '-' + columnIndex} data={points} activeShape={false} fill="var(--nx-seriesA)" shape={<Observation />}
                        {...motion} animationMatchBy={matchObservation} animationInterpolateFn={scatterFade} />
                      <Tooltip cursor={false} isAnimationActive={false} position={{ x: 0, y: 0 }} wrapperStyle={{ zIndex: 20, maxWidth: '100%', pointerEvents: 'none' }}
                        content={<MatrixTooltip cell={cell} horizontal={horizontal} vertical={vertical} groups={groups} />} />
                    </ScatterChart>}
                  </ResponsiveContainer>
                </div>
              </div>;
            })}
          </Fragment>)}
        </div>
      </div>
      <ul aria-label="Cohort observation counts" className="mt-4 mb-0 flex list-none flex-wrap gap-x-6 gap-y-2 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] p-0 pt-4 text-[length:var(--nx-type-legend-size)]">
        {groups.map(cohort => <li key={cohort.id} data-nx-matrix-key={cohort.id} className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: cohort.paint }} /><span className="break-words">{cohort.label}</span><span className="shrink-0 text-[var(--nx-muted)] tabular-nums">n={cohort.n}</span></li>)}
      </ul>
      <p className="mt-3 mb-0 break-words text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">Diagonal: overlaid counts in {binCount} equal-width bins. Other panels: paired observations. Scales are shared per metric; unavailable coordinates are omitted per panel.</p>
      {metrics.every(metric => metric.n === 0) && <p role="status" className="mt-3 mb-0 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">No finite coordinates available.</p>}
    </InspectionRegion>
  </NocturneChartFrame>;
}
