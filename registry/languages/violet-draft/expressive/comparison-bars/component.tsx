'use client';

import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  getNiceTickValues,
  ResponsiveContainer,
  Text,
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
const compactTick = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const smallTick = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 2,
});
const scientificTick = new Intl.NumberFormat('en-US', {
  notation: 'scientific',
  maximumSignificantDigits: 2,
});
const formatTick = (value: number) => {
  const label = (value > 0 && value < 1 ? smallTick : compactTick).format(
    value,
  );
  // Bound extreme magnitudes without rounding a nonzero tick to zero.
  return label.length > 6 ? scientificTick.format(value) : label;
};

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
        formatted:
          typeof d.value === 'number' && Number.isFinite(d.value)
            ? valueFormatter(d.value)
            : '—',
      })),
    [data, valueFormatter],
  );
  const maximum = rows.reduce((max, d) => Math.max(max, d.value ?? 0), 0);
  const ticks = useMemo(() => {
    const end = maximum || 1;
    // Keep both endpoints when a rounded intermediate label would repeat one.
    const labels = new Set([formatTick(0), formatTick(end)]);
    return [
      0,
      ...getNiceTickValues([0, end], 4).filter((value) => {
        if (value <= 0 || value >= end) return false;
        const label = formatTick(value);
        if (labels.has(label)) return false;
        labels.add(label);
        return true;
      }),
      end,
    ];
  }, [maximum]);
  const rowTracks = `repeat(${rows.length || 1}, minmax(48px, 1fr))`;
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
        {/* Intrinsic value width keeps numbers whole. Equal CSS rows grow from
            actual wrapped text, and the native plot measures their shared box. */}
        <div>
          <div className="grid min-w-min grid-cols-[74px_12px_minmax(120px,1fr)_8px_max-content] pb-[28px] text-[length:var(--nx-type-legend-size)] leading-tight">
            <div
              className="col-start-1 grid"
              style={{ gridTemplateRows: rowTracks }}
            >
              {rows.map((d) => (
                <div
                  key={d.id}
                  data-nx-comparison-row={d.id}
                  className="flex items-center py-1.5"
                >
                  <span
                    data-nx-comparison-label={d.id}
                    className="[overflow-wrap:anywhere]"
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative col-start-3">
              <div className="absolute inset-x-0 top-0 -bottom-[28px]">
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
                    margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
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
                      ticks={ticks}
                      interval="preserveStartEnd"
                      // Fractional endpoints need clearance beyond the host-font estimate.
                      minTickGap={22}
                      axisLine={false}
                      tickLine={false}
                      height={28}
                      tickMargin={10}
                      tickFormatter={formatTick}
                      tick={(props) => {
                        const { x, y, index, visibleTicksCount, payload } =
                          props;
                        const first = index === 0;
                        const last = index === visibleTicksCount - 1;
                        // Recharts measures text outside the scoped font. Anchor
                        // endpoint ink inward without shortening the bar scale.
                        return (
                          <Text
                            x={first || last ? payload.coordinate : x}
                            y={y}
                            textAnchor={
                              first ? 'start' : last ? 'end' : 'middle'
                            }
                            verticalAnchor="start"
                            className="recharts-cartesian-axis-tick-value"
                            fill="var(--nx-faint)"
                            fontSize="var(--nx-type-axis-size)"
                          >
                            {formatTick(payload.value)}
                          </Text>
                        );
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
              </div>
            </div>
            <div
              className="col-start-5 grid min-w-[50px] text-right text-[var(--nx-muted)] tabular-nums"
              style={{ gridTemplateRows: rowTracks }}
            >
              {rows.map((d) => (
                <div
                  key={d.id}
                  data-nx-comparison-value={d.id}
                  className="flex flex-col justify-center py-1.5"
                >
                  <span data-nx-comparison-number className="whitespace-nowrap">
                    {d.formatted}
                  </span>
                  {d.value !== null && unit && (
                    <span className="w-min min-w-full [overflow-wrap:anywhere]">
                      {unit}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </VioletChartFrame>
  );
}
