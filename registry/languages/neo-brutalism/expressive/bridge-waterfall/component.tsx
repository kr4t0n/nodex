'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { NeoChartFrame, NeoChartTooltip } from '../../../../_shared/neo-chart-frame';

export type BridgeWaterfallDatum = { id: string; label: string } & (
  | { kind: 'start' | 'change'; value: number | null }
  | { kind: 'total' }
);
export interface BridgeWaterfallProps {
  data: readonly BridgeWaterfallDatum[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Step { id: string; label: string; index: number; kind: BridgeWaterfallDatum['kind']; value: number | null; after: number | null; range: [number, number] | null; fill: string }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);

function BridgeBlock({ x, y, width, height, payload }: BarShapeProps) {
  const step = payload as Step;
  return step.range && height > 0 ? <Rectangle x={x} y={y} width={width} height={height} radius={0} fill={step.fill} stroke="var(--nx-ink)"
    style={{ strokeWidth: 'var(--nx-stroke-mark)', filter: 'drop-shadow(var(--nx-shadow-badge) var(--nx-ink))' }}
    data-nx-bridge={step.id} data-nx-from={step.range[0]} data-nx-to={step.range[1]} /> : null;
}

function BridgeAnnotations({ steps, format }: { steps: readonly Step[]; format: (value: number) => string }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none">{steps.map((step, index) => {
    const x = xScale(step.index, { position: 'middle' });
    const y = yScale(step.range?.[1] ?? 0);
    const next = steps[index + 1];
    const nextX = next ? xScale(next.index, { position: 'middle' }) : undefined;
    const joinY = step.after === null ? undefined : yScale(step.after);
    if (x === undefined || y === undefined) return null;
    return <g key={step.id}>
      {next?.range && next.kind !== 'start' && nextX !== undefined && joinY !== undefined && <line data-nx-bridge-join={step.id} x1={x + (nextX - x) * 0.3} x2={nextX - (nextX - x) * 0.3} y1={joinY} y2={joinY}
        stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4" />}
      <text data-nx-bridge-label={step.id} x={x} y={y - 14} textAnchor="middle" fill="var(--nx-ink)" fontSize="var(--nx-type-control-size)" fontWeight="var(--nx-font-weight-bold)">
        {step.value === null ? '—' : `${step.kind === 'change' && step.value > 0 ? '+' : ''}${format(step.value)}`}
      </text>
    </g>;
  })}</g>;
}

/** A missing change breaks the running balance until a caller supplies a new start. */
export function BridgeWaterfall({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber, width, height, animate = true, className, 'aria-label': label = 'Changes in a running total' }: BridgeWaterfallProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { steps, validIds } = useMemo(() => {
    let running: number | null = null;
    const ids = new Set<string>(); let validIds = true;
    const steps = data.map((datum, index): Step => {
      if (!datum.id.trim() || ids.has(datum.id)) validIds = false; ids.add(datum.id);
      const input = datum.kind === 'total' ? running : datum.value !== null && Number.isFinite(datum.value) ? datum.value : null;
      const before = running;
      if (datum.kind === 'start') running = input;
      else if (datum.kind === 'change') running = before !== null && input !== null && Number.isFinite(before + input) ? before + input : null;
      const from = datum.kind === 'change' ? before : 0;
      const range: [number, number] | null = from !== null && running !== null ? [Math.min(from, running), Math.max(from, running)] : null;
      return { id: datum.id, label: datum.label, index, kind: datum.kind, range, after: running, value: range ? (datum.kind === 'change' ? input : running) : null,
        fill: datum.kind === 'start' ? 'var(--nx-seriesA)' : datum.kind === 'total' ? 'var(--nx-seriesB)' : (input ?? 0) < 0 ? 'var(--nx-seriesD)' : 'var(--nx-seriesC)' };
    });
    return { steps, validIds };
  }, [data]);
  const minimum = Math.min(0, ...steps.map(step => step.range?.[0] ?? 0));
  const maximum = Math.max(0, ...steps.map(step => step.range?.[1] ?? 0));
  const status = !validIds ? 'Each step needs a unique, nonempty ID.' : !steps.some(step => step.range) ? 'No running balance available. Supply a starting value.' : null;
  return <NeoChartFrame ref={ref} name="bridge-waterfall" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto overflow-y-hidden ${height === undefined ? 'aspect-[600/330] min-h-[290px]' : 'min-h-[240px] flex-1'}`}>
      {/* Keep library sizing overflow inside the plot; only the actual plot dimensions may scroll. */}
      <div className="h-full overflow-clip" style={{ minWidth: Math.max(380, steps.length * 82) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 340 }}>
          <BarChart data={steps} accessibilityLayer title={label} desc="Totals start at zero; changes float between balances. Plus and minus labels give direction. Missing changes break the balance until a new start. Use left and right arrow keys to inspect steps."
            margin={{ top: 38, right: 18, bottom: 8, left: 0 }} barCategoryGap="40%"
            className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
            <XAxis dataKey="index" scale="band" interval={0} height={36} tickLine={false} tickMargin={14} axisLine={false}
              tickFormatter={(index: number) => steps[index]?.label ?? ''} tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <YAxis domain={[minimum, maximum || (minimum === 0 ? 1 : 0)]} width={44} tickCount={4} tickLine={false} axisLine={false} tickFormatter={(value: number) => compact.format(value)}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <ReferenceLine y={0} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-hairline)" />
            <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
              const step = typeof index === 'number' ? steps[index] : undefined;
              return active && step ? <NeoChartTooltip title={step.label}><div>{step.value === null ? 'Unavailable' : `${step.kind === 'change' && step.value > 0 ? '+' : ''}${valueFormatter(step.value)} ${unitLabel}`}</div>{step.kind === 'change' && step.after !== null && <div>Balance: {valueFormatter(step.after)}</div>}</NeoChartTooltip> : null;
            }} />
            <Bar id={`${id}-bridge`} dataKey="range" fill="var(--nx-ink)" stroke="none" shape={BridgeBlock} activeBar={false} {...motion} />
            <BridgeAnnotations steps={steps} format={valueFormatter} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </NeoChartFrame>;
}
