'use client';

import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useYAxisScale,
  matchByDataKey,
  type BarShapeProps,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
  formatHearthNumber,
  hearthChartFocus,
  hearthTones,
  type HearthTone,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthBarsDatum {
  id: string;
  label: string;
  /** Finite, nonnegative amount. Null and invalid values remain unavailable. */
  value: number | null;
  /** Stable category identity; omitted tones use the primary series. */
  tone?: HearthTone;
}

export interface HearthBarsProps {
  data: readonly HearthBarsDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Row extends HearthBarsDatum {
  index: number;
  paint: string;
}
const matchObservation = matchByDataKey('id');

function Amount({ x, y, width, height, payload }: BarShapeProps) {
  const row = payload as Row;
  if (row.value === null || row.value === 0 || width <= 0 || height <= 0)
    return <g />;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={row.paint}
      style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }}
      data-nx-hearth-bar={row.id}
      data-nx-value={row.value}
    />
  );
}

function Readings({
  rows,
  format,
}: {
  rows: readonly Row[];
  format: (value: number) => string;
}) {
  const scale = useYAxisScale();
  const plot = usePlotArea();
  if (!scale || !plot) return null;
  return (
    <g>
      {rows.map((row) => {
        const y = scale(row.index, { position: 'middle' });
        if (y === undefined) return null;
        return (
          <foreignObject
            key={row.id}
            x={plot.x}
            y={y - 30}
            width={plot.width}
            height={24}
          >
            <div
              data-nx-hearth-row={row.id}
              className="flex h-full items-baseline justify-between gap-[var(--nx-space-fieldGap)] text-[length:var(--nx-type-body-size)] text-[var(--nx-ink)]"
            >
              <span title={row.label} className="min-w-0 truncate">
                {row.label}
              </span>
              <span
                data-nx-hearth-reading={row.id}
                className="shrink-0 text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] tabular-nums"
              >
                {row.value === null ? '—' : format(row.value)}
              </span>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
}

/** Caller-ordered amounts share one zero baseline and keep their labels above the marks. */
export function HearthBars({
  data,
  unitLabel = 'Value',
  contextLabel,
  valueFormatter = formatHearthNumber,
  animate = true,
  className,
  'aria-label': label = 'Amounts by category',
}: HearthBarsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { rows, valid, maximum } = useMemo(() => {
    const ids = new Set<string>();
    let valid = true;
    const rows = data.map((datum, index): Row => {
      if (!datum.id.trim() || ids.has(datum.id)) valid = false;
      ids.add(datum.id);
      return {
        ...datum,
        index,
        value:
          typeof datum.value === 'number' &&
          Number.isFinite(datum.value) &&
          datum.value >= 0
            ? datum.value
            : null,
        paint: hearthTones[datum.tone ?? 'a'],
      };
    });
    return {
      rows,
      valid,
      maximum: rows.reduce((max, row) => Math.max(max, row.value ?? 0), 0),
    };
  }, [data]);
  const status = !valid
    ? 'Each category needs a unique, nonempty ID.'
    : !rows.length
      ? 'No categories to compare.'
      : null;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-bars"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      {!!rows.length && !rows.some((row) => row.value !== null) && (
        <p
          role="status"
          className="mt-[var(--nx-space-cardBodyGap)] text-[length:var(--nx-type-note-size)] text-[var(--nx-muted)]"
        >
          No observations available.
        </p>
      )}
      <div className="mt-[var(--nx-space-cardBodyGap)] overflow-x-auto">
        <div
          style={{
            minWidth: 280,
            height: Math.max(120, rows.length * 64 + 40),
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 296 }}
          >
            <BarChart
              data={rows}
              layout="vertical"
              accessibilityLayer
              title={label}
              desc={`Bar length shows ${unitLabel} from zero, in the supplied order. A dash means unavailable; zero has a label without a bar. Left Arrow moves to the next category; Right Arrow moves back.`}
              margin={{ top: 14, right: 8, bottom: 0, left: 8 }}
              maxBarSize={10}
              className={hearthChartFocus}
            >
              <XAxis
                type="number"
                domain={[0, maximum || 1]}
                height={28}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <YAxis dataKey="index" type="category" scale="band" hide />
              <Tooltip
                filterNull={false}
                cursor={false}
                isAnimationActive={false}
                content={({ active, label: index }) => {
                  const row =
                    typeof index === 'number' ? rows[index] : undefined;
                  return active && row ? (
                    <HearthChartTooltip title={row.label}>
                      {row.value === null
                        ? 'Unavailable'
                        : `${valueFormatter(row.value)} ${unitLabel}`}
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              <Bar
                id={`${id}-bars`}
                dataKey="value"
                name={unitLabel}
                fill="var(--nx-seriesA)"
                stroke="none"
                activeBar={false}
                shape={Amount}
                {...motion}
                animationMatchBy={matchObservation}
              />
              <Readings rows={rows} format={valueFormatter} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </HearthChartFrame>
  );
}
