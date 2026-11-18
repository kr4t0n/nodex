'use client';

import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  VioletChartFrame,
  VioletTooltip,
} from '../../../../_shared/violet-chart-frame';

export interface ComparisonDatum {
  id: string;
  label: string;
  /** Nonnegative magnitudes share a zero baseline. Null/nonfinite values are unavailable. */
  value: number | null;
  tone?: 'a' | 'b' | 'c' | 'd';
}
export interface ComparisonBarsProps {
  data: readonly ComparisonDatum[];
  title: string;
  subtitle?: string;
  unit?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
}
const tones = {
  a: 'var(--nx-seriesA)',
  b: 'var(--nx-seriesB)',
  c: 'var(--nx-seriesC)',
  d: 'var(--nx-seriesD)',
};
const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export function ComparisonBars({
  data,
  title,
  subtitle,
  unit = '',
  valueFormatter = formatNumber,
  animate = true,
  className,
}: ComparisonBarsProps) {
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
  const maximum = rows.reduce((max, d) => Math.max(max, d.value ?? 0), 0);
  const rowHeight = rows.reduce(
    (height, d) =>
      Math.max(
        height,
        Math.ceil(d.label.length / 9) * 16 + 12,
        Math.ceil(
          (d.value === null
            ? 1
            : (valueFormatter(d.value) + (unit ? ' ' + unit : '')).length) / 6,
        ) *
          16 +
          12,
      ),
    48,
  );
  const status =
    rows.some((d) => !d.id.trim() || (d.value !== null && d.value < 0)) ||
    new Set(rows.map((d) => d.id)).size !== rows.length
      ? 'Categories need unique IDs and nonnegative magnitudes.'
      : !rows.length
        ? 'No categories available.'
        : null;
  return (
    <VioletChartFrame
      ref={ref}
      name="comparison-bars"
      title={title}
      subtitle={subtitle}
      status={status}
      className={className}
    >
      <div className="mt-[var(--nx-space-cardBodyGap)] overflow-x-auto">
        {/* Wrapped labels and direct values retain the same row as each native bar. */}
        <div
          className="relative min-w-[280px]"
          style={{ height: Math.max(70, rows.length * rowHeight + 28) }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 292 }}
          >
            <BarChart
              data={rows}
              layout="vertical"
              accessibilityLayer
              title={title}
              desc="Bar lengths compare nonnegative values from zero. Labels and exact values appear beside each bar. Use left and right arrow keys to inspect categories."
              margin={{ top: 0, left: 86, right: 58, bottom: 0 }}
              className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]"
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--nx-plotGrid)"
                strokeWidth="var(--nx-stroke-hairline)"
              />
              <XAxis
                type="number"
                domain={[0, maximum || 1]}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                height={28}
                tickMargin={10}
                tick={{
                  fill: 'var(--nx-faint)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <YAxis type="category" dataKey="id" hide />
              <Tooltip
                isAnimationActive={false}
                filterNull={false}
                cursor={false}
                content={({ active, label }) => {
                  const row = rows.find((d) => d.id === label);
                  return active && row ? (
                    <VioletTooltip>
                      {row.label}:{' '}
                      {row.value === null
                        ? 'Unavailable'
                        : `${valueFormatter(row.value)}${unit ? ' ' + unit : ''}`}
                    </VioletTooltip>
                  ) : null;
                }}
              />
              <Bar
                id={id}
                dataKey="value"
                barSize={20}
                background={{ fill: 'var(--nx-plotTrack)' }}
                {...motion}
                shape={(props: unknown) => {
                  const p = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                    payload?: ComparisonDatum;
                  };
                  if (
                    !p.payload ||
                    !Number.isFinite(p.x) ||
                    !Number.isFinite(p.y)
                  )
                    return <g />;
                  return (
                    <rect
                      data-nx-comparison={p.payload.id}
                      x={p.x}
                      y={p.y}
                      width={p.width ?? 0}
                      height={p.height}
                      fill={tones[p.payload.tone ?? 'a']}
                      stroke="none"
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bottom-[28px] grid"
            style={{
              gridTemplateRows: `repeat(${rows.length || 1}, minmax(0, 1fr))`,
            }}
          >
            {rows.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-[length:var(--nx-type-legend-size)] leading-tight"
              >
                <span className="w-[74px] [overflow-wrap:anywhere]">
                  {d.label}
                </span>
                <span
                  data-nx-comparison-value={d.id}
                  className="w-[50px] text-right [overflow-wrap:anywhere] text-[var(--nx-muted)] tabular-nums"
                >
                  {d.value === null ? '—' : valueFormatter(d.value)}
                  {d.value !== null && unit ? ' ' + unit : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VioletChartFrame>
  );
}
