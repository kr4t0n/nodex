'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface CapacityRingDatum { used: number | null; capacity: number | null }
export interface CapacityRingProps extends SignalChartProps {
  data: CapacityRingDatum;
  unitLabel?: string;
  /** Fraction of capacity, from zero to one. Omit to leave usage unclassified. */
  warningAt?: number;
}
interface Part { name: string; value: number; fill: string }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function Slice({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload }: PieSectorShapeProps) {
  const part = payload as Part;
  if (!part.value) return <g />;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={part.fill} stroke="none"
    data-nx-capacity-part={part.name} data-nx-value={part.value} data-nx-start={startAngle} data-nx-end={endAngle} />;
}

/** Exact used/available proportions against an explicit capacity; no minimum sector angle. */
export function CapacityRing({ data, unitLabel = 'units', warningAt, label = 'RESOURCE CAPACITY', animate = true, 'aria-label': accessibleLabel = 'Used and available capacity', ...frame }: CapacityRingProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const valid = data.used !== null && data.capacity !== null && Number.isFinite(data.used) && Number.isFinite(data.capacity) && data.capacity > 0 && data.used >= 0 && data.used <= data.capacity;
  const validThreshold = warningAt === undefined || (Number.isFinite(warningAt) && warningAt >= 0 && warningAt <= 1);
  const ratio = valid ? data.used! / data.capacity! : null;
  const state = ratio === null || !validThreshold ? 'UNAVAILABLE' : warningAt === undefined ? 'USAGE' : ratio === 1 ? 'AT CAPACITY' : ratio >= warningAt ? 'ABOVE THRESHOLD' : 'WITHIN THRESHOLD';
  const fill = warningAt === undefined ? 'var(--nx-ink)' : ratio === 1 ? 'var(--nx-crit)' : ratio !== null && ratio >= warningAt ? 'var(--nx-warn)' : 'var(--nx-withinObjective)';
  const parts = useMemo((): Part[] => valid ? [{ name: 'Used', value: data.used!, fill }, { name: 'Available', value: data.capacity! - data.used!, fill: 'var(--nx-grid)' }] : [], [valid, data.used, data.capacity, fill]);
  const status = !valid ? 'Usage must be between zero and a finite, positive capacity.' : !validThreshold ? 'The warning threshold must be a fraction from zero to one.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="capacity-ring" label={label} animated={motion.isAnimationActive} status={status}
    summary={<span className="text-[length:var(--nx-type-caption-size)]" style={{ color: status ? 'var(--nx-muted)' : fill }}>{state}</span>}>
    <div className="mt-3 grid min-h-0 flex-1 items-center gap-4 overflow-auto @min-[420px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 240 }}>
          <PieChart accessibilityLayer title={accessibleLabel} desc="The ring compares used and available capacity. Sector angles are exact proportions. Use left and right arrows to inspect the two parts."
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
            <Tooltip isAnimationActive={false} content={({ active, payload }) => {
              const part = payload?.[0]?.payload as Part | undefined;
              return active && part ? <SignalTooltip surface="var(--nx-surface)" title={part.name}>{number.format(part.value)} {unitLabel}</SignalTooltip> : null;
            }} />
            <Pie id={`${id}-capacity`} data={parts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="70%" outerRadius="93%" startAngle={90} endAngle={-270}
              minAngle={0} paddingAngle={0} shape={Slice} rootTabIndex={-1} fill="var(--nx-ink)" stroke="none" {...motion} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span data-nx-capacity-percent className="text-[length:var(--nx-type-stat-largeSize)] font-[number:var(--nx-font-weight-bold)] tracking-[var(--nx-type-stat-tracking)] tabular-nums">{ratio === null ? '—' : `${number.format(ratio * 100)}%`}</span>
          <span className="mt-1 text-[length:var(--nx-type-caption-size)] tracking-[var(--nx-type-caption-tracking)] text-[var(--nx-muted)]">USED</span>
        </div>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-3 text-[length:var(--nx-type-body-size)] tabular-nums">
        <dt className="text-[var(--nx-muted)]">Used</dt><dd className="m-0 text-right">{valid ? number.format(data.used!) : '—'} {unitLabel}</dd>
        <dt className="text-[var(--nx-muted)]">Available</dt><dd className="m-0 text-right">{valid ? number.format(data.capacity! - data.used!) : '—'} {unitLabel}</dd>
        <dt className="border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-3 text-[var(--nx-muted)]">Capacity</dt><dd className="m-0 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-3 text-right">{valid ? number.format(data.capacity!) : '—'} {unitLabel}</dd>
        {warningAt !== undefined && validThreshold && <><dt className="text-[var(--nx-muted)]">Warning at</dt><dd className="m-0 text-right text-[var(--nx-warn)]">{number.format(warningAt * 100)}%</dd></>}
      </dl>
    </div>
  </SignalChartFrame>;
}
