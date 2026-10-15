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
  useHearthEntrance,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthSeasonsAxis {
  id: string;
  label: string;
}

export interface HearthSeasonsDatum {
  rowId: string;
  columnId: string;
  /** Index into levels. Null, or any other value, means not recorded. */
  level: number | null;
}

export interface HearthSeasonsProps {
  data: readonly HearthSeasonsDatum[];
  rows: readonly HearthSeasonsAxis[];
  columns: readonly HearthSeasonsAxis[];
  /** Two to five ordered level names, lowest first. The first level is absence. */
  levels: readonly string[];
  unitLabel?: string;
  contextLabel?: string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Cell {
  cellId: string;
  rowLabel: string;
  columnLabel: string;
  x: number;
  y: number;
  level: number | null;
  /** Share of the strongest level, from 0 to 1. */
  strength: number;
}

const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

/** Absence is an empty field, a recorded level fills and outlines, and unrecorded cells stay dashed. */
function CellMark({
  payload,
  cx,
  cy,
  columns,
  rows,
}: {
  payload?: Cell;
  cx?: number;
  cy?: number;
  columns: number;
  rows: number;
}) {
  const plot = usePlotArea();
  if (!payload || cx === undefined || cy === undefined || !plot) return <g />;
  const width = Math.max(1, plot.width / columns - 4);
  const height = Math.max(1, plot.height / rows - 4);
  const bounds = {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    style: { rx: 'var(--nx-radius-heatCell)', ry: 'var(--nx-radius-heatCell)' },
  };
  if (payload.level === null)
    return (
      <rect
        {...bounds}
        x={bounds.x + 0.5}
        y={bounds.y + 0.5}
        width={width - 1}
        height={height - 1}
        fill="none"
        stroke="var(--nx-border)"
        strokeWidth="var(--nx-stroke-hairline)"
        strokeDasharray="3 3"
        data-nx-hearth-cell={payload.cellId}
        data-nx-value="missing"
      />
    );
  return (
    <g data-nx-hearth-cell={payload.cellId} data-nx-value={payload.level}>
      <rect {...bounds} fill="var(--nx-fieldFill)" />
      {payload.strength > 0 && (
        <rect
          {...bounds}
          x={bounds.x + 0.5}
          y={bounds.y + 0.5}
          width={width - 1}
          height={height - 1}
          fill="var(--nx-valueFill)"
          fillOpacity={payload.strength}
          stroke="var(--nx-valueFill)"
          strokeWidth="var(--nx-stroke-hairline)"
        />
      )}
    </g>
  );
}

function Swatch({ strength, dashed }: { strength: number; dashed?: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="12" viewBox="0 0 16 12">
      {dashed ? (
        <rect
          x={0.5}
          y={0.5}
          width={15}
          height={11}
          rx={3}
          fill="none"
          stroke="var(--nx-border)"
          strokeWidth="var(--nx-stroke-hairline)"
          strokeDasharray="3 3"
        />
      ) : (
        <>
          <rect width={16} height={12} rx={3} fill="var(--nx-fieldFill)" />
          {strength > 0 && (
            <rect
              x={0.5}
              y={0.5}
              width={15}
              height={11}
              rx={3}
              fill="var(--nx-valueFill)"
              fillOpacity={strength}
              stroke="var(--nx-valueFill)"
              strokeWidth="var(--nx-stroke-hairline)"
            />
          )}
        </>
      )}
    </svg>
  );
}

/** A seasonal table: ordered levels per row and column, read together as one fading surface. */
export function HearthSeasons({
  data,
  rows,
  columns,
  levels,
  unitLabel = 'Levels',
  contextLabel,
  animate = true,
  className,
  'aria-label': label = 'Levels across rows and columns',
}: HearthSeasonsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const surface = useHearthEntrance(animate, 'fade', fadeIn);
  const id = useId();
  const top = levels.length - 1;
  const { cells, valid } = useMemo(() => {
    const unique = (items: readonly HearthSeasonsAxis[]) =>
      items.every((item) => item.id.trim()) &&
      new Set(items.map((item) => item.id)).size === items.length;
    let valid = unique(rows) && unique(columns);
    const rowIds = new Set(rows.map((row) => row.id));
    const columnIds = new Set(columns.map((column) => column.id));
    const readings = new Map<string, number | null>();
    for (const datum of data) {
      const key = JSON.stringify([datum.rowId, datum.columnId]);
      if (
        !rowIds.has(datum.rowId) ||
        !columnIds.has(datum.columnId) ||
        readings.has(key)
      )
        valid = false;
      readings.set(
        key,
        Number.isInteger(datum.level) &&
          datum.level! >= 0 &&
          datum.level! <= top
          ? datum.level
          : null,
      );
    }
    const cells = rows.flatMap((row, y) =>
      columns.map((column, x): Cell => {
        const cellId = JSON.stringify([row.id, column.id]);
        const level = readings.get(cellId) ?? null;
        return {
          cellId,
          rowLabel: row.label,
          columnLabel: column.label,
          x,
          y,
          level,
          strength: level === null || top < 1 ? 0 : level / top,
        };
      }),
    );
    return { cells, valid };
  }, [data, rows, columns, top]);
  const status =
    levels.length < 2 || levels.length > 5
      ? 'Name two to five levels.'
      : !valid
        ? 'Use unique axis IDs and one reading per declared row and column pair.'
        : !cells.length
          ? 'Declare rows and columns to read.'
          : null;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-seasons"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      {!cells.some((cell) => cell.level !== null) && (
        <p
          role="status"
          className="mt-[var(--nx-space-cardBodyGap)] text-[length:var(--nx-type-note-size)] text-[var(--nx-muted)]"
        >
          No levels recorded.
        </p>
      )}
      <ul
        aria-label="Levels"
        className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap gap-x-[var(--nx-space-gridGap)] gap-y-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"
      >
        {levels.map((name, level) => (
          <li key={name} className="flex items-center gap-2">
            <Swatch strength={top < 1 ? 0 : level / top} />
            {name}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Swatch strength={0} dashed />
          Not recorded
        </li>
      </ul>
      <div
        ref={surface}
        className="mt-[var(--nx-space-fieldGap)] overflow-x-auto"
      >
        <div
          style={{
            minWidth: Math.max(300, columns.length * 30 + 112),
            height: Math.max(160, rows.length * 34 + 32),
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 304 }}
          >
            <ScatterChart
              accessibilityLayer
              title={label}
              desc={`Each cell shows one of ${levels.length} ordered levels, from ${levels[0]} to ${levels.at(-1)}; deeper fill means a higher level. A dashed outline means not recorded. Use Left and Right Arrow to inspect every cell in row order.`}
              margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
              className={hearthChartFocus}
            >
              <XAxis
                dataKey="x"
                type="number"
                orientation="top"
                domain={[-0.5, columns.length - 0.5]}
                ticks={columns.map((_, index) => index)}
                interval={0}
                height={28}
                tickMargin={6}
                axisLine={false}
                tickLine={false}
                tickFormatter={(index: number) => columns[index]?.label ?? ''}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                reversed
                domain={[-0.5, rows.length - 0.5]}
                ticks={rows.map((_, index) => index)}
                interval={0}
                width={108}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                tickFormatter={(index: number) => rows[index]?.label ?? ''}
                tick={{
                  fill: 'var(--nx-ink)',
                  fontSize: 'var(--nx-type-caption-size)',
                }}
              />
              <Tooltip
                cursor={false}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const cell = payload?.[0]?.payload as Cell | undefined;
                  return active && cell ? (
                    <HearthChartTooltip
                      title={`${cell.rowLabel} · ${cell.columnLabel}`}
                    >
                      {cell.level === null
                        ? 'Not recorded'
                        : levels[cell.level]}
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              <Scatter
                id={`${id}-cells`}
                data={cells}
                fill="var(--nx-valueFill)"
                activeShape={false}
                isAnimationActive={false}
                shape={(props: unknown) => (
                  <CellMark
                    {...(props as { payload?: Cell; cx?: number; cy?: number })}
                    columns={columns.length}
                    rows={rows.length}
                  />
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </HearthChartFrame>
  );
}
