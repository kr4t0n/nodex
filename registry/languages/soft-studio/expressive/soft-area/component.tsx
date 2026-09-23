'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftAreaDatum {
  id: string; label: string;
  /** Finite, strictly increasing numeric coordinate; spacing follows the supplied intervals. */
  x: number;
  /** Nonnegative value; null and invalid readings break the trend. */
  value: number | null;
}
export interface SoftAreaProps {
  data: readonly SoftAreaDatum[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}

const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Observation(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: SoftAreaDatum };
  if (cx === undefined || cy === undefined || !payload || payload.value === null) return <g />;
  return <circle cx={cx} cy={cy} r={4} fill="var(--nx-surfaceFill)" stroke="var(--nx-trendLine)" strokeWidth="var(--nx-stroke-mark)"
    data-nx-soft-point={payload.id} data-nx-value={payload.value} />;
}

/** Monotone interpolation preserves local extrema; missing samples leave visible gaps. */
export function SoftArea({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Values over time' }: SoftAreaProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { points, maximum, valid } = useMemo(() => {
    const ids = new Set<string>(); let valid = true; let maximum = 0;
    const points = data.map((datum, index): SoftAreaDatum => {
      if (!datum.id.trim() || ids.has(datum.id) || !Number.isFinite(datum.x) || (index > 0 && datum.x <= data[index - 1]!.x)) valid = false;
      ids.add(datum.id);
      const value = datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 ? datum.value : null;
      maximum = Math.max(maximum, value ?? 0);
      return { ...datum, value };
    });
    return { points, maximum, valid };
  }, [data]);
  const status = !valid ? 'Use unique, nonempty IDs and finite, strictly increasing X coordinates.'
    : !points.some(point => point.value !== null) ? 'No observations available.' : null;
  const last = points.at(-1);

  return <StudioChartFrame ref={ref} name="soft-area" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span data-nx-soft-latest className="break-all text-[length:var(--nx-type-stat-size)] leading-[var(--nx-type-stat-lineHeight)] font-[number:var(--nx-font-weight-bold)] tracking-[var(--nx-type-stat-tracking)] tabular-nums">
        {last?.value === null || !last ? '—' : valueFormatter(last.value)}
      </span>
      <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{last?.label}{last?.value === null ? ' · unavailable' : ''}</span>
    </div>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto overflow-y-hidden ${height === undefined ? 'h-[240px]' : 'min-h-0 flex-1'}`}>
      <div className="h-full overflow-hidden" style={{ minWidth: Math.max(280, points.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 240 }}>
          <AreaChart data={points} accessibilityLayer title={label}
            desc={`Height shows ${unitLabel} from zero. Horizontal distance follows numeric X coordinates. Gaps mean unavailable readings. The headline is the final supplied observation. Use left and right arrow keys to inspect observations.`}
            margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} ticks={points.map(point => point.x)} minTickGap={24}
              height={34} tickMargin={12} axisLine={false} tickLine={false} padding={{ left: 6, right: 6 }}
              tickFormatter={(x: number) => points.find(point => point.x === x)?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <YAxis domain={[0, maximum || 1]} width={42} tickCount={4} axisLine={false} tickLine={false}
              tickFormatter={(value: number) => compact.format(value)} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '3 4' }}
              content={({ active, label: x }) => {
                const point = points.find(point => point.x === x);
                return active && point ? <StudioChartTooltip title={point.label}>{point.value === null ? 'Unavailable' : `${valueFormatter(point.value)} ${unitLabel}`}</StudioChartTooltip> : null;
              }} />
            <Area id={`${id}-trend`} dataKey="value" name={unitLabel} type="monotoneX" baseValue={0} connectNulls={false}
              fill="var(--nx-trendFill)" fillOpacity={1} stroke="var(--nx-trendLine)" style={{ strokeWidth: 'var(--nx-stroke-mark)' }}
              dot={Observation} activeDot={false} {...motion} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </StudioChartFrame>;
}
