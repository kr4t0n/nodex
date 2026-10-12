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
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthLineDatum {
  id: string;
  label: string;
  /** Finite, strictly increasing coordinate; spacing follows this value. */
  x: number;
  /** Finite signed reading. Missing readings break the line. */
  value: number | null;
}
export interface HearthLineProps {
  data: readonly HearthLineDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => numbers.format(value);

function Observation({ props }: { props: unknown }) {
  const { cx, cy, payload } = props as {
    cx?: number;
    cy?: number;
    payload?: HearthLineDatum;
  };
  if (
    !payload ||
    payload.value === null ||
    cx === undefined ||
    cy === undefined ||
    !Number.isFinite(cx) ||
    !Number.isFinite(cy)
  )
    return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--nx-paper)"
      stroke="var(--nx-seriesA)"
      strokeWidth="var(--nx-stroke-mark)"
      data-nx-hearth-point={payload.id}
      data-nx-value={payload.value}
    />
  );
}

/** Straight segments connect only supplied readings on a numeric horizontal scale. */
export function HearthLine({
  data,
  unitLabel = 'Value',
  contextLabel,
  valueFormatter = formatNumber,
  animate = true,
  className,
  'aria-label': label = 'Ordered observations',
}: HearthLineProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { rows, validIds, validX, minimum, maximum } = useMemo(() => {
    const ids = new Set<string>();
    let validIds = true;
    let minimum = 0;
    let maximum = 0;
    const rows = data.map((datum) => {
      if (!datum.id.trim() || ids.has(datum.id)) validIds = false;
      ids.add(datum.id);
      const value =
        typeof datum.value === 'number' && Number.isFinite(datum.value)
          ? datum.value
          : null;
      minimum = Math.min(minimum, value ?? 0);
      maximum = Math.max(maximum, value ?? 0);
      return { ...datum, value };
    });
    return {
      rows,
      validIds,
      minimum,
      maximum,
      validX: rows.every(
        (row, index) =>
          Number.isFinite(row.x) && (index === 0 || row.x > rows[index - 1]!.x),
      ),
    };
  }, [data]);
  const status = !validIds
    ? 'Each observation needs a unique, nonempty ID.'
    : !validX
      ? 'X coordinates must be finite and strictly increasing.'
      : !rows.some((row) => row.value !== null)
        ? 'No observations available.'
        : null;
  const first = rows[0]?.x ?? 0;
  const last = rows.at(-1)?.x ?? 1;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-line"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      <div className="mt-[var(--nx-space-gridGap)] overflow-x-auto">
        <div style={{ minWidth: Math.max(280, rows.length * 52), height: 260 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 260 }}
          >
            <LineChart
              data={rows}
              accessibilityLayer
              title={label}
              desc={`Height shows ${unitLabel}; horizontal distance follows numeric X coordinates. Missing readings break the line. Use Left and Right Arrow to inspect observations.`}
              margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
              className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)] [&_[tabindex]:focus-visible]:[outline-offset:calc(-1*var(--nx-stroke-mark))] [&_[tabindex]:focus:not(:focus-visible)]:outline-none"
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--nx-grid)"
                strokeWidth="var(--nx-stroke-hairline)"
              />
              <XAxis
                dataKey="x"
                type="number"
                domain={first === last ? [first - 1, last + 1] : [first, last]}
                ticks={rows.map((row) => row.x)}
                minTickGap={20}
                height={36}
                tickMargin={12}
                axisLine={false}
                tickLine={false}
                padding={{ left: 8, right: 8 }}
                tickFormatter={(x: number) =>
                  rows.find((row) => row.x === x)?.label ?? ''
                }
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <YAxis
                domain={[minimum, maximum || (minimum === 0 ? 1 : 0)]}
                width={48}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <Tooltip
                filterNull={false}
                isAnimationActive={false}
                cursor={{
                  stroke: 'var(--nx-border)',
                  strokeWidth: 'var(--nx-stroke-hairline)',
                  strokeDasharray: '3 4',
                }}
                content={({ active, label: x }) => {
                  const row = rows.find((row) => row.x === x);
                  return active && row ? (
                    <HearthChartTooltip title={row.label}>
                      {row.value === null
                        ? 'Unavailable'
                        : `${valueFormatter(row.value)} ${unitLabel}`}
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              <Line
                id={`${id}-line`}
                dataKey="value"
                name={unitLabel}
                type="linear"
                connectNulls={false}
                fill="none"
                stroke="var(--nx-seriesA)"
                strokeWidth="var(--nx-stroke-mark)"
                activeDot={false}
                dot={(props: unknown) => <Observation props={props} />}
                {...motion}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </HearthChartFrame>
  );
}
