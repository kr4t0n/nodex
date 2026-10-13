'use client';

import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useXAxisScale,
  type BarShapeProps,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
  formatHearthNumber,
  hearthChartFocus,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthHistogramDatum {
  id: string;
  /** Finite measurement. Null and non-finite readings are counted as unavailable. */
  value: number | null;
}

export interface HearthHistogramProps {
  data: readonly HearthHistogramDatum[];
  /** Positive, finite bin width in the measurement's unit. */
  binWidth: number;
  /** Left edge of the first bin. Defaults to the lowest reading rounded down to a bin edge. */
  binStart?: number;
  unitLabel?: string;
  contextLabel?: string;
  /** Plural noun for what is counted, such as loaves. Defaults to readings. */
  countLabel?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Bin {
  index: number;
  start: number;
  end: number;
  center: number;
  count: number;
}

const maximumBins = 60;

/** Recharts places a numeric-axis bar by its centre; the true bin edges come from the scale. */
function BinMark({ y, height, payload }: BarShapeProps) {
  const scale = useXAxisScale();
  const bin = payload as Bin;
  const left = scale?.(bin.start);
  const right = scale?.(bin.end);
  if (bin.count === 0 || left === undefined || right === undefined)
    return <g />;
  return (
    <rect
      x={left + 1}
      y={y}
      width={Math.max(0, right - left - 2)}
      height={height}
      fill="var(--nx-valueFill)"
      style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }}
      data-nx-hearth-bin={bin.index}
      data-nx-value={bin.count}
    />
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Equal-width bins count readings from a shared zero, with the median as a written note. */
export function HearthHistogram({
  data,
  binWidth,
  binStart,
  unitLabel = 'Value',
  contextLabel,
  countLabel = 'readings',
  valueFormatter = formatHearthNumber,
  animate = true,
  className,
  'aria-label': label = 'Distribution of readings',
}: HearthHistogramProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const result = useMemo(() => {
    const ids = new Set<string>();
    let validIds = true;
    const values: number[] = [];
    for (const datum of data) {
      if (!datum.id.trim() || ids.has(datum.id)) validIds = false;
      ids.add(datum.id);
      if (typeof datum.value === 'number' && Number.isFinite(datum.value))
        values.push(datum.value);
    }
    if (!(Number.isFinite(binWidth) && binWidth > 0) || !values.length)
      return { validIds, values, bins: [] as Bin[], middle: null };
    const low = Math.min(...values);
    const high = Math.max(...values);
    const first =
      binStart !== undefined && Number.isFinite(binStart) && binStart <= low
        ? binStart
        : Math.floor(low / binWidth) * binWidth;
    const count = Math.max(1, Math.floor((high - first) / binWidth) + 1);
    if (count > maximumBins)
      return { validIds, values, bins: [] as Bin[], middle: null };
    const bins = Array.from({ length: count }, (_, index): Bin => {
      const start = first + index * binWidth;
      return {
        index,
        start,
        end: start + binWidth,
        center: start + binWidth / 2,
        count: 0,
      };
    });
    for (const value of values)
      bins[Math.min(count - 1, Math.floor((value - first) / binWidth))]!
        .count++;
    return { validIds, values, bins, middle: median(values) };
  }, [data, binWidth, binStart]);
  const { bins, values, middle } = result;
  const unavailable = data.length - values.length;
  const status = !result.validIds
    ? 'Each reading needs a unique, nonempty ID.'
    : !(Number.isFinite(binWidth) && binWidth > 0)
      ? 'A finite, positive bin width is required.'
      : !values.length
        ? 'No observations available.'
        : !bins.length
          ? `Use a wider bin; at most ${maximumBins} bins fit.`
          : null;
  const first = bins[0]?.start ?? 0;
  const last = bins.at(-1)?.end ?? 1;
  const tallest = bins.reduce((max, bin) => Math.max(max, bin.count), 0);
  const step = Math.max(1, Math.ceil(tallest / 4));
  const counts = Array.from(
    { length: Math.ceil(Math.max(1, tallest) / step) + 1 },
    (_, index) => index * step,
  );
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-histogram"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      <div className="mt-[var(--nx-space-gridGap)] overflow-x-auto">
        <div style={{ minWidth: Math.max(280, bins.length * 28), height: 280 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 280 }}
          >
            <BarChart
              data={bins}
              accessibilityLayer
              title={label}
              desc={`Each bar counts ${countLabel} from ${valueFormatter(first)} to ${valueFormatter(last)} ${unitLabel} in bins of ${valueFormatter(binWidth)}. Height starts at zero. The labelled rule marks the median. Use Left and Right Arrow to inspect bins.`}
              margin={{ top: 36, right: 16, bottom: 4, left: 0 }}
              barCategoryGap={0}
              className={hearthChartFocus}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--nx-grid)"
                strokeWidth="var(--nx-stroke-hairline)"
              />
              <XAxis
                dataKey="center"
                type="number"
                domain={[first, last]}
                ticks={[...bins.map((bin) => bin.start), last]}
                interval="preserveStartEnd"
                minTickGap={16}
                height={36}
                tickMargin={10}
                axisLine={{
                  stroke: 'var(--nx-border)',
                  strokeWidth: 'var(--nx-stroke-hairline)',
                }}
                tickLine={false}
                tickFormatter={valueFormatter}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <YAxis
                domain={[0, counts.at(-1)!]}
                ticks={counts}
                width={36}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <Tooltip
                cursor={false}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const bin = payload?.[0]?.payload as Bin | undefined;
                  return active && bin ? (
                    <HearthChartTooltip
                      title={`${valueFormatter(bin.start)}–${valueFormatter(bin.end)} ${unitLabel}`}
                    >
                      {bin.count} {countLabel}
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              <Bar
                id={`${id}-bins`}
                dataKey="count"
                name={countLabel}
                fill="var(--nx-valueFill)"
                activeBar={false}
                shape={BinMark}
                {...motion}
              />
              {middle !== null && (
                <ReferenceLine
                  x={middle}
                  stroke="var(--nx-ink)"
                  strokeWidth="var(--nx-stroke-hairline)"
                  label={{
                    value: `Median ${valueFormatter(middle)}`,
                    position: 'top',
                    offset: 12,
                    fill: 'var(--nx-ink)',
                    fontSize: 'var(--nx-type-note-size)',
                    fontStyle: 'italic',
                    fontFamily: 'var(--nx-font-heading)',
                  }}
                  data-nx-hearth-median={middle}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="mt-[var(--nx-space-fieldGap)] text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
        {values.length} {countLabel}
        {unavailable > 0 && ` · ${unavailable} unavailable, not shown`}
      </p>
    </HearthChartFrame>
  );
}
