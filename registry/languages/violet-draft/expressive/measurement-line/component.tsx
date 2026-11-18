'use client';

import { useId, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { numericDomain } from '../../../../_shared/numeric-domain';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  VioletChartFrame,
  VioletTooltip,
} from '../../../../_shared/violet-chart-frame';

export interface MeasurementDatum {
  id: string;
  label: string;
  /** Finite, strictly increasing coordinates retain unequal observation intervals. */
  x: number;
  /** Null and nonfinite readings leave a gap; zero is a measured value. */
  value: number | null;
}
export interface MeasurementLineProps {
  data: readonly MeasurementDatum[];
  title: string;
  subtitle?: string;
  unit?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
}
const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export function MeasurementLine({
  data,
  title,
  subtitle,
  unit = '',
  valueFormatter = formatNumber,
  animate = true,
  className,
}: MeasurementLineProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const rows = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        value:
          typeof d.value === 'number' && Number.isFinite(d.value)
            ? d.value
            : null,
      })),
    [data],
  );
  const xDomain = numericDomain(rows.map((d) => d.x));
  const yDomain = numericDomain(
    rows.flatMap((d) => (d.value === null ? [] : [d.value])),
  );
  const valid =
    rows.every((d, i) => d.id.trim() && (!i || d.x > rows[i - 1]!.x)) &&
    new Set(rows.map((d) => d.id)).size === rows.length;
  const status =
    !valid || !xDomain || !yDomain
      ? 'Observations need unique IDs and finite, increasing X coordinates within a finite range.'
      : !rows.some((d) => d.value !== null)
        ? 'No measurements available.'
        : null;
  return (
    <VioletChartFrame
      ref={ref}
      name="measurement-line"
      title={title}
      subtitle={subtitle}
      status={status}
      className={className}
    >
      <div className="mt-[var(--nx-space-cardBodyGap)] h-[236px] min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 600, height: 236 }}
        >
          <LineChart
            data={rows}
            accessibilityLayer
            title={title}
            desc="Horizontal distance follows numeric X. Straight lines join measured values; missing values leave gaps. Use left and right arrow keys to inspect readings."
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--nx-plotGrid)"
              strokeWidth="var(--nx-stroke-hairline)"
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain ?? [0, 1]}
              ticks={rows.map((d) => d.x)}
              tickFormatter={(x: number) =>
                rows.find((d) => d.x === x)?.label ?? ''
              }
              minTickGap={24}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              height={36}
              tick={{
                fill: 'var(--nx-faint)',
                fontSize: 'var(--nx-type-axis-size)',
              }}
            />
            <YAxis
              domain={yDomain ?? [0, 1]}
              width={44}
              tickCount={4}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(value)
              }
              tick={{
                fill: 'var(--nx-faint)',
                fontSize: 'var(--nx-type-axis-size)',
              }}
            />
            <Tooltip
              isAnimationActive={false}
              filterNull={false}
              cursor={{
                stroke: 'var(--nx-ruleDashed)',
                strokeWidth: 'var(--nx-stroke-hairline)',
              }}
              content={({ active, label }) => {
                const row = rows.find((d) => d.x === label);
                return active && row ? (
                  <VioletTooltip>
                    <div>{row.label}</div>
                    <div>
                      {row.value === null
                        ? 'Unavailable'
                        : `${valueFormatter(row.value)}${unit ? ' ' + unit : ''}`}
                    </div>
                  </VioletTooltip>
                ) : null;
              }}
            />
            <Line
              id={id}
              dataKey="value"
              type="linear"
              connectNulls={false}
              stroke="var(--nx-seriesA)"
              strokeWidth="var(--nx-stroke-mark)"
              fill="none"
              activeDot={false}
              {...motion}
              dot={(props: unknown) => {
                const { cx, cy, payload } = props as {
                  cx?: number;
                  cy?: number;
                  payload?: MeasurementDatum;
                };
                return payload?.value !== null &&
                  Number.isFinite(cx) &&
                  Number.isFinite(cy) ? (
                  <circle
                    key={payload?.id}
                    data-nx-measurement={payload?.id}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="var(--nx-seriesA)"
                    stroke="none"
                  />
                ) : (
                  <g />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </VioletChartFrame>
  );
}
