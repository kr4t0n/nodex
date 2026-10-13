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
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  type BarShapeProps,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
  formatHearthNumber,
  hearthChartFocus,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthDumbbellDatum {
  id: string;
  label: string;
  /** Earlier reading. Null and non-finite values are unavailable. */
  start: number | null;
  /** Later reading. Null and non-finite values are unavailable. */
  end: number | null;
}

export interface HearthDumbbellProps {
  data: readonly HearthDumbbellDatum[];
  /** Name of the earlier reading, such as First time. */
  startLabel?: string;
  /** Name of the later reading, such as Tenth time. */
  endLabel?: string;
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Row {
  id: string;
  label: string;
  index: number;
  start: number | null;
  end: number | null;
  /** Low and high reading for the library's range bar; one reading spans no width. */
  range: [number, number] | null;
}

/**
 * The library supplies the row band and the animated range width; the readings'
 * own positions place each end, and the drawn share of the width runs the
 * connector from the earlier reading towards the later one.
 */
function Pair({ y, width, height, payload }: BarShapeProps) {
  const scale = useXAxisScale();
  const row = payload as Row;
  if (!scale) return <g />;
  if (row.start === null || row.end === null) {
    // A lone reading keeps its own mark, with no connector to an absent one.
    const value = row.start ?? row.end;
    const x = value === null ? undefined : scale(value);
    if (x === undefined) return <g />;
    return row.end === null ? (
      <circle
        cx={x}
        cy={y + height / 2}
        r={5}
        fill="var(--nx-paper)"
        stroke="var(--nx-muted)"
        strokeWidth="var(--nx-stroke-mark)"
        data-nx-hearth-start={row.id}
        data-nx-value={row.start!}
      />
    ) : (
      <circle
        cx={x}
        cy={y + height / 2}
        r={6}
        fill="var(--nx-seriesA)"
        data-nx-hearth-end={row.id}
        data-nx-value={row.end}
      />
    );
  }
  const from = scale(row.start);
  const to = scale(row.end);
  if (from === undefined || to === undefined) return <g />;
  const middle = y + height / 2;
  const span = Math.abs(to - from);
  const drawn = span > 0 ? Math.min(1, Math.max(0, width / span)) : 1;
  return (
    <g data-nx-hearth-pair={row.id}>
      <line
        x1={from}
        x2={from + (to - from) * drawn}
        y1={middle}
        y2={middle}
        stroke="var(--nx-border)"
        strokeWidth="var(--nx-stroke-mark)"
      />
      <circle
        cx={from}
        cy={middle}
        r={5}
        fill="var(--nx-paper)"
        stroke="var(--nx-muted)"
        strokeWidth="var(--nx-stroke-mark)"
        data-nx-hearth-start={row.id}
        data-nx-value={row.start}
      />
      <circle
        cx={to}
        cy={middle}
        r={6 * drawn}
        fill="var(--nx-seriesA)"
        data-nx-hearth-end={row.id}
        data-nx-value={row.end}
      />
    </g>
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
            y={y - 34}
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
                className="shrink-0 tabular-nums"
              >
                <span className="text-[var(--nx-muted)]">
                  {row.start === null ? '—' : format(row.start)}
                </span>
                <span aria-hidden="true" className="text-[var(--nx-muted)]">
                  {' → '}
                </span>
                <span className="text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)]">
                  {row.end === null ? '—' : format(row.end)}
                </span>
              </span>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
}

/** Each row joins an earlier and a later reading on one shared scale. */
export function HearthDumbbell({
  data,
  startLabel = 'Before',
  endLabel = 'After',
  unitLabel = 'Value',
  contextLabel,
  valueFormatter = formatHearthNumber,
  animate = true,
  className,
  'aria-label': label = 'Change between two readings',
}: HearthDumbbellProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { rows, valid, minimum, maximum } = useMemo(() => {
    const ids = new Set<string>();
    let valid = true;
    let minimum = Infinity;
    let maximum = -Infinity;
    const read = (value: number | null) =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    const rows = data.map((datum, index): Row => {
      if (!datum.id.trim() || ids.has(datum.id)) valid = false;
      ids.add(datum.id);
      const start = read(datum.start);
      const end = read(datum.end);
      for (const value of [start, end])
        if (value !== null) {
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
      return {
        id: datum.id,
        label: datum.label,
        index,
        start,
        end,
        range:
          start === null && end === null
            ? null
            : [
                Math.min(start ?? end!, end ?? start!),
                Math.max(start ?? end!, end ?? start!),
              ],
      };
    });
    return { rows, valid, minimum, maximum };
  }, [data]);
  const status = !valid
    ? 'Each row needs a unique, nonempty ID.'
    : !rows.length
      ? 'No rows to compare.'
      : !rows.some((row) => row.range)
        ? 'No readings available.'
        : null;
  const low = Math.min(0, minimum);
  const high = maximum > low ? 'auto' : low + 1;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-dumbbell"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      <ul
        aria-label="Readings"
        className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap gap-x-[var(--nx-space-gridGap)] gap-y-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"
      >
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
            <circle
              cx={7}
              cy={7}
              r={5}
              fill="var(--nx-paper)"
              stroke="var(--nx-muted)"
              strokeWidth="var(--nx-stroke-mark)"
            />
          </svg>
          {startLabel}
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={6} fill="var(--nx-seriesA)" />
          </svg>
          {endLabel}
        </li>
      </ul>
      <div className="mt-[var(--nx-space-fieldGap)] overflow-x-auto">
        <div
          style={{
            minWidth: 280,
            height: Math.max(120, rows.length * 64 + 44),
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 364 }}
          >
            <BarChart
              data={rows}
              layout="vertical"
              accessibilityLayer
              title={label}
              desc={`Each row joins ${startLabel} (hollow) to ${endLabel} (filled) on one ${unitLabel} scale from zero. A dash means unavailable. Left Arrow moves to the next row; Right Arrow moves back.`}
              margin={{ top: 22, right: 12, bottom: 0, left: 12 }}
              className={hearthChartFocus}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--nx-grid)"
                strokeWidth="var(--nx-stroke-hairline)"
              />
              <XAxis
                type="number"
                domain={[low, high]}
                height={28}
                tickCount={5}
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
                  const read = (value: number | null) =>
                    value === null ? 'Unavailable' : valueFormatter(value);
                  return active && row ? (
                    <HearthChartTooltip title={row.label}>
                      <div className="tabular-nums">
                        {startLabel}: {read(row.start)}
                      </div>
                      <div className="tabular-nums">
                        {endLabel}: {read(row.end)}
                      </div>
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              <Bar
                id={`${id}-pairs`}
                dataKey="range"
                name={unitLabel}
                fill="var(--nx-seriesA)"
                barSize={14}
                activeBar={false}
                shape={Pair}
                {...motion}
              />
              <Readings rows={rows} format={valueFormatter} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </HearthChartFrame>
  );
}
