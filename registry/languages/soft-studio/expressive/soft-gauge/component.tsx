'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftGaugeDatum { value: number | null; target: number | null }
export interface SoftGaugeProps {
  data: SoftGaugeDatum; unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Part { id: string; label: string; value: number; fill: string }
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Arc({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload }: PieSectorShapeProps) {
  const part = payload as Part;
  if (!part.value) return <g />;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle}
    fill={part.fill} stroke="none" data-nx-soft-gauge-arc={part.id} data-nx-value={part.value} data-nx-start={startAngle} data-nx-end={endAngle} />;
}

/** A true half-circle measures progress against an explicit target, without clamping excess. */
export function SoftGauge({ data, unitLabel = 'Units', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Progress toward a target' }: SoftGaugeProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const valid = data.value !== null && data.target !== null && Number.isFinite(data.value) && Number.isFinite(data.target)
    && data.target > 0 && data.value >= 0 && data.value <= data.target;
  const parts = useMemo((): Part[] => valid ? [
    { id: 'complete', label: 'Complete', value: data.value!, fill: 'var(--nx-seriesA)' },
    { id: 'remaining', label: 'Remaining', value: data.target! - data.value!, fill: 'var(--nx-fieldFill)' },
  ] : [], [data.value, data.target, valid]);
  const status = valid ? null : 'Progress must be between zero and a finite, positive target.';

  return <StudioChartFrame ref={ref} name="soft-gauge" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={`mt-[var(--nx-space-cardBodyGap)] flex min-w-0 items-center justify-center ${height === undefined ? '' : 'min-h-0 flex-1'}`}>
      <div className="w-full max-w-[400px]">
        {/* Give Recharts a measured height before it creates the sectors. Percentage
            heights on a CSS aspect-ratio wrapper can collapse during style updates. */}
        <ResponsiveContainer width="100%" aspect={400 / 230} maxHeight={230} initialDimension={{ width: 400, height: 230 }}>
          <PieChart accessibilityLayer title={label}
            desc={`The blue arc is the exact completed share of a 180-degree scale. The pale arc is the remaining share. Zero and full completion have no artificial sliver. Use left and right arrow keys to inspect both parts.`}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <Tooltip isAnimationActive={false} content={({ active, payload }) => {
              const part = payload?.[0]?.payload as Part | undefined;
              return active && part ? <StudioChartTooltip title={part.label}>{valueFormatter(part.value)} {unitLabel}</StudioChartTooltip> : null;
            }} />
            <Pie id={`${id}-progress`} data={parts} dataKey="value" nameKey="label" cx="50%" cy="88%" innerRadius="135%" outerRadius="166%"
              startAngle={180} endAngle={0} minAngle={0} paddingAngle={0} rootTabIndex={-1} shape={Arc} fill="var(--nx-seriesA)" stroke="none" {...motion} />
            <g pointerEvents="none" fontFamily="var(--nx-font-sans)">
              <text x="50%" y="88%" dy="-1em" textAnchor="middle" data-nx-soft-gauge-percent fill="var(--nx-ink)"
                fontSize="var(--nx-type-stat-size)" fontWeight="var(--nx-font-weight-bold)" letterSpacing="var(--nx-type-stat-tracking)"
                className="tabular-nums">{valid ? percent.format(data.value! / data.target!) : '—'}</text>
              <text x="50%" y="88%" dy="-0.3em" textAnchor="middle" data-nx-soft-gauge-reading fill="var(--nx-muted)"
                fontSize="var(--nx-type-caption-size)">{valid ? `${valueFormatter(data.value!)} of ${valueFormatter(data.target!)} ${unitLabel}` : 'Unavailable'}</text>
              <g fill="var(--nx-muted)" fontSize="var(--nx-type-caption-size)" className="tabular-nums">
                <text x="3%" y="98%" data-nx-soft-gauge-min>{valueFormatter(0)}</text>
                <text x="97%" y="98%" textAnchor="end" data-nx-soft-gauge-max>{valid ? valueFormatter(data.target!) : '—'}</text>
              </g>
            </g>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  </StudioChartFrame>;
}
