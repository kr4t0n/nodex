'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey, usePlotArea, useXAxisScale, useYAxisScale, type AnimationInterpolateFn, type BarRectangleItem, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { NocturneChartFrame, NocturneChartTooltip } from '../../../../_shared/nocturne-chart-frame';

export type NocturneWaterfallDatum = { id: string; label: string } & (
  | { kind: 'start' | 'change'; value: number | null }
  | { kind: 'total' }
);
export interface NocturneWaterfallProps {
  data: readonly NocturneWaterfallDatum[];
  unitLabel?: string; contextLabel?: string;
  valueFormatter?: (value: number) => string; deltaFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Step {
  id: string; label: string; index: number; kind: NocturneWaterfallDatum['kind'];
  input: number | null; before: number | null; after: number | null;
  range: [number, number] | null; plotRange: [number, number]; opacity?: number;
}
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);
const formatDelta = (value: number) => (value > 0 ? '+' : '') + number.format(value);
const matchStep = matchByDataKey('id');
// Native timing, final native bounds: a fading connector never separates from its bars.
const fadeBars: AnimationInterpolateFn<BarRectangleItem, 'horizontal' | 'vertical'> = (items, progress) =>
  (items ?? []).flatMap(item => item.status === 'removed' ? [] : [{ ...item.next, payload: { ...item.next.payload, opacity: progress } }]);

function WaterfallStep({ x, y, width, height, payload, valueFormat, deltaFormat }: BarShapeProps & { valueFormat: (value: number) => string; deltaFormat: (value: number) => string }) {
  const step = payload as Step;
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const plot = usePlotArea();
  if (!xScale || !yScale || !plot) return <g />;
  const center = x + width / 2;
  const start = xScale(step.index, { position: 'start' }); const end = xScale(step.index, { position: 'end' });
  if (start === undefined || end === undefined) return <g />;
  const band = end - start;
  const previous = step.index > 0 ? xScale(step.index - 1, { position: 'start' }) : undefined;
  const joinY = step.before === null ? undefined : yScale(step.before);
  const reading = !step.range ? '—' : step.kind === 'change' ? deltaFormat(step.input!) : valueFormat(step.after!);
  const fill = step.kind !== 'change' ? 'var(--nx-seriesA)' : (step.input ?? 0) < 0 ? 'var(--nx-seriesC)' : step.input === 0 ? 'var(--nx-muted)' : 'var(--nx-seriesB)';
  return <g data-nx-waterfall-step={step.id} opacity={step.opacity ?? 1}>
    <rect x={center - band / 2} y={plot.y} width={band} height={plot.height} fill="transparent" />
    {step.range && step.kind !== 'start' && previous !== undefined && joinY !== undefined && <line data-nx-waterfall-join={step.id}
      x1={x + previous - start + width} x2={x} y1={joinY} y2={joinY} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="3 4" />}
    {step.range && (height > 0
      ? <rect data-nx-waterfall-bar={step.id} x={x} y={y} width={width} height={height} fill={fill} style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }} />
      : <line data-nx-waterfall-zero={step.id} x1={x} x2={x + width} y1={y} y2={y} stroke={fill} strokeWidth="var(--nx-stroke-hairline)" />)}
    <foreignObject x={center - band / 2 + 3} y={(step.range ? y : plot.y + plot.height) - 27} width={band - 6} height={22}>
      <div className="flex h-full items-center justify-center text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] text-[var(--nx-ink)] tabular-nums">
        <span data-nx-waterfall-reading={step.id} className="truncate" title={step.range ? reading : 'Unavailable'}>{reading}</span>
      </div>
    </foreignObject>
    <foreignObject x={center - band / 2 + 3} y={plot.y + plot.height + 12} width={band - 6} height={22}>
      <div className="flex h-full items-center justify-center text-[length:var(--nx-type-axis-size)] text-[var(--nx-muted)]"><span className="truncate" title={step.label}>{step.label}</span></div>
    </foreignObject>
  </g>;
}

/** Changes accumulate in caller order. Only an explicit start restores an unknown balance. */
export function NocturneWaterfall({ data, unitLabel = 'Change in balance', contextLabel, valueFormatter = formatNumber, deltaFormatter = formatDelta,
  width, height, animate = true, className, 'aria-label': label = 'Changes between opening and closing balances' }: NocturneWaterfallProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { steps, valid, domain } = useMemo(() => {
    const valid = data.every(row => row.id.trim()) && new Set(data.map(row => row.id)).size === data.length;
    let balance: number | null = null;
    const steps = data.map((row, index): Step => {
      const before = balance;
      const input = row.kind === 'total' ? balance : row.value !== null && Number.isFinite(row.value) ? row.value : null;
      if (row.kind === 'start') balance = input;
      if (row.kind === 'change') balance = before !== null && input !== null && Number.isFinite(before + input) ? before + input : null;
      const from = row.kind === 'change' ? before : 0;
      const range: [number, number] | null = from !== null && balance !== null ? [Math.min(from, balance), Math.max(from, balance)] : null;
      return { id: row.id, label: row.label, kind: row.kind, index, input, before, after: balance, range, plotRange: range ?? [0, 0] };
    });
    return { steps, valid, domain: numericDomain([0, ...steps.flatMap(step => step.range ?? [])]) };
  }, [data]);
  const status = !valid ? 'Each step needs a unique, nonempty ID.' : !domain ? 'The balance span is too large to display.' : !steps.length ? 'No balance changes supplied.' : null;
  return <NocturneChartFrame ref={ref} name="nocturne-waterfall" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={'mt-[var(--nx-space-cardBodyGap)] overflow-auto ' + (height === undefined ? '' : 'min-h-0 flex-1')}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(420, steps.length * 88 + 56), height: 286 }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 654, height: 286 }}>
            <BarChart data={steps} accessibilityLayer title={label} desc="Start and total bars extend from zero. Changes float between consecutive balances; labels state signed changes. Totals are derived. Missing or overflowing changes break the balance until an explicit start. Color indicates direction, not an outcome. Use left and right arrow keys to inspect steps."
              barCategoryGap="30%" margin={{ top: 32, right: 8, bottom: 0, left: 0 }}
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" />
              <XAxis dataKey="index" scale="band" height={40} tick={false} axisLine={false} tickLine={false} />
              <YAxis type="number" domain={domain ?? [0, 1]} width={48} tickCount={4} tickFormatter={value => compact.format(value)} axisLine={false} tickLine={false} tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)' }} />
              <ReferenceLine y={0} stroke="var(--nx-border)" strokeWidth="var(--nx-stroke-hairline)" />
              <Tooltip cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
                const step = typeof index === 'number' ? steps[index] : undefined;
                return active && step ? <NocturneChartTooltip title={step.label}>
                  {step.kind === 'change' && <div>Change: {step.input === null ? 'Unavailable' : deltaFormatter(step.input)}</div>}
                  {step.kind === 'change' && <div>Before: {step.before === null ? 'Unavailable' : valueFormatter(step.before)}</div>}
                  <div>{step.kind === 'start' ? 'Start' : 'Balance'}: {step.after === null ? 'Unavailable' : valueFormatter(step.after)}</div>
                </NocturneChartTooltip> : null;
              }} />
              <Bar id={id + '-steps'} dataKey="plotRange" fill="var(--nx-seriesA)" activeBar={false}
                shape={props => <WaterfallStep {...props} valueFormat={valueFormatter} deltaFormat={deltaFormatter} />}
                {...motion} animationMatchBy={matchStep} animationInterpolateFn={fadeBars} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
        <span className="flex items-center gap-2"><i className="size-2 rounded-sm bg-[var(--nx-seriesA)]" />Balance</span>
        <span className="flex items-center gap-2"><i className="size-2 rounded-sm bg-[var(--nx-seriesB)]" />+ Increase</span>
        <span className="flex items-center gap-2"><i className="size-2 rounded-sm bg-[var(--nx-seriesC)]" />− Decrease</span>
      </div>
    </div>
  </NocturneChartFrame>;
}
