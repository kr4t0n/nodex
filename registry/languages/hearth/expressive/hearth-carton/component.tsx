'use client';

import { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
  hearthChartFocus,
  hearthTones,
  type HearthTone,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthCartonDatum {
  id: string;
  label: string;
  /** Whole, nonnegative number of units. */
  count: number;
  /** Stable category identity; omitted tones follow the group order a–d. */
  tone?: HearthTone;
}

export interface HearthCartonProps {
  /** One to four groups, filled in order. Their counts may not exceed capacity. */
  data: readonly HearthCartonDatum[];
  /** Whole number of places, 1 to 48. Defaults to 12. */
  capacity?: number;
  /** Places per row, 1 to 12. Defaults to 6. */
  columns?: number;
  /** Name for unfilled places. Defaults to Empty. */
  emptyLabel?: string;
  unitLabel?: string;
  contextLabel?: string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Unit {
  unitId: string;
  x: number;
  y: number;
  /** Group index, or null for an empty place. */
  group: number | null;
  ordinal: number;
}

const order: HearthTone[] = ['a', 'b', 'c', 'd'];

/** Every place keeps its outline; a counted unit fills it in its group's color. */
function Place({
  payload,
  cx,
  cy,
  columns,
  rows,
  paints,
}: {
  payload?: Unit;
  cx?: number;
  cy?: number;
  columns: number;
  rows: number;
  paints: readonly string[];
}) {
  const plot = usePlotArea();
  if (!payload || cx === undefined || cy === undefined || !plot) return <g />;
  const radius = Math.max(
    2,
    Math.min(plot.width / columns, plot.height / rows) / 2 - 5,
  );
  if (payload.group === null)
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius - 0.5}
        fill="none"
        stroke="var(--nx-border)"
        strokeWidth="var(--nx-stroke-hairline)"
        data-nx-hearth-unit={payload.unitId}
        data-nx-value="empty"
      />
    );
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={paints[payload.group]}
      data-nx-hearth-unit={payload.unitId}
      data-nx-value={payload.group}
    />
  );
}

/** Whole units in fixed places: each group fills consecutive places, then the rest stay empty. */
export function HearthCarton({
  data,
  capacity = 12,
  columns = 6,
  emptyLabel = 'Empty',
  unitLabel = 'Count',
  contextLabel,
  animate = true,
  className,
  'aria-label': label = 'Units by group',
}: HearthCartonProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const validShape =
    Number.isInteger(capacity) &&
    capacity >= 1 &&
    capacity <= 48 &&
    Number.isInteger(columns) &&
    columns >= 1 &&
    columns <= 12;
  const rows = validShape ? Math.ceil(capacity / columns) : 1;
  const { units, used, valid } = useMemo(() => {
    const valid =
      data.every(
        (datum) =>
          datum.id.trim() && Number.isInteger(datum.count) && datum.count >= 0,
      ) && new Set(data.map((datum) => datum.id)).size === data.length;
    const used = valid ? data.reduce((sum, datum) => sum + datum.count, 0) : 0;
    if (!valid || !validShape || used > capacity)
      return { units: [] as Unit[], used, valid };
    const groups = data.flatMap((datum, index) =>
      Array.from({ length: datum.count }, (_, ordinal) => ({
        group: index,
        ordinal: ordinal + 1,
      })),
    );
    const units = Array.from({ length: capacity }, (_, place): Unit => {
      const filled = groups[place];
      return {
        unitId: `place-${place + 1}`,
        x: place % columns,
        y: Math.floor(place / columns),
        group: filled?.group ?? null,
        ordinal: filled?.ordinal ?? place - used + 1,
      };
    });
    return { units, used, valid };
  }, [data, capacity, columns, validShape]);
  const paints = data.map(
    (datum, index) => hearthTones[datum.tone ?? order[index]!],
  );
  const status = !validShape
    ? 'Use a whole capacity from 1 to 48 and 1 to 12 places per row.'
    : data.length < 1 || data.length > 4
      ? 'Use one to four groups.'
      : !valid
        ? 'Each group needs a unique, nonempty ID and a whole, nonnegative count.'
        : used > capacity
          ? `The counts add up to ${used}, more than the ${capacity} places.`
          : null;
  const empty = capacity - used;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-carton"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      <div className="@container">
        <div className="mt-[var(--nx-space-cardBodyGap)] grid items-center gap-[var(--nx-space-gridGap)] @min-[520px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div
            className="w-full max-w-[440px]"
            style={{ aspectRatio: `${columns} / ${rows}` }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 420, height: 140 }}
            >
              <ScatterChart
                accessibilityLayer
                title={label}
                desc={`${capacity} places in rows of ${columns}. Each group fills consecutive places in the order listed; outlined places are ${emptyLabel.toLowerCase()}. Use Left and Right Arrow to inspect every place.`}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                className={hearthChartFocus}
              >
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[-0.5, columns - 0.5]}
                  hide
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  reversed
                  domain={[-0.5, rows - 0.5]}
                  hide
                />
                <Tooltip
                  cursor={false}
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    const unit = payload?.[0]?.payload as Unit | undefined;
                    if (!active || !unit) return null;
                    const group =
                      unit.group === null ? undefined : data[unit.group];
                    return (
                      <HearthChartTooltip title={group?.label ?? emptyLabel}>
                        {group
                          ? `${unit.ordinal} of ${group.count}`
                          : `${unit.ordinal} of ${empty}`}
                      </HearthChartTooltip>
                    );
                  }}
                />
                <Scatter
                  id={`${id}-units`}
                  data={units}
                  fill="var(--nx-seriesA)"
                  activeShape={false}
                  shape={(props: unknown) => (
                    <Place
                      {...(props as {
                        payload?: Unit;
                        cx?: number;
                        cy?: number;
                      })}
                      columns={columns}
                      rows={rows}
                      paints={paints}
                    />
                  )}
                  {...motion}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ul
            aria-label="Groups"
            className="grid gap-[var(--nx-space-fieldGap)] text-[length:var(--nx-type-body-size)]"
          >
            {data.map((datum, index) => (
              <li
                key={datum.id}
                data-nx-hearth-group={datum.id}
                className="flex items-center gap-3"
              >
                <svg aria-hidden="true" width="14" height="14">
                  <circle cx={7} cy={7} r={6} fill={paints[index]} />
                </svg>
                <span className="min-w-0 flex-1">{datum.label}</span>
                <span className="text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] tabular-nums">
                  {datum.count}
                </span>
              </li>
            ))}
            {empty > 0 && (
              <li className="flex items-center gap-3 text-[var(--nx-muted)]">
                <svg aria-hidden="true" width="14" height="14">
                  <circle
                    cx={7}
                    cy={7}
                    r={5.5}
                    fill="none"
                    stroke="var(--nx-border)"
                    strokeWidth="var(--nx-stroke-hairline)"
                  />
                </svg>
                <span className="min-w-0 flex-1">{emptyLabel}</span>
                <span className="text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] tabular-nums">
                  {empty}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </HearthChartFrame>
  );
}
