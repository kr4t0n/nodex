'use client';

import { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import {
  VioletChartFrame,
  VioletTooltip,
} from '../../../../_shared/violet-chart-frame';

export interface ObservationAxis {
  id: string;
  label: string;
}
export interface MatrixObservation {
  rowId: string;
  columnId: string;
  value: number | null;
}
export interface ObservationMatrixProps {
  data: readonly MatrixObservation[];
  rows: readonly ObservationAxis[];
  columns: readonly ObservationAxis[];
  /** Fixed, finite increasing bounds. Out-of-range readings are rejected rather than clamped. */
  domain: readonly [number, number];
  title: string;
  subtitle?: string;
  unit?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}
interface Cell extends MatrixObservation {
  x: number;
  y: number;
  rowLabel: string;
  columnLabel: string;
  tone: string;
}
const levels = [
  'var(--nx-heatLow)',
  'var(--nx-heatQuiet)',
  'var(--nx-heatMiddle)',
  'var(--nx-heatStrong)',
  'var(--nx-heatHigh)',
];
const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

function CellMark({ props }: { props: unknown }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const { payload } = props as { payload?: Cell };
  if (!payload || !xScale || !yScale) return null;
  const left = xScale(payload.x - 0.5),
    right = xScale(payload.x + 0.5);
  const top = yScale(payload.y - 0.5),
    bottom = yScale(payload.y + 0.5);
  if (
    left === undefined ||
    right === undefined ||
    top === undefined ||
    bottom === undefined
  )
    return null;
  return (
    <g
      data-nx-observation={JSON.stringify([payload.rowId, payload.columnId])}
      data-nx-value={payload.value ?? 'missing'}
    >
      <rect
        x={Math.min(left, right) + 1}
        y={Math.min(top, bottom) + 1}
        width={Math.max(0, Math.abs(right - left) - 2)}
        height={Math.max(0, Math.abs(bottom - top) - 2)}
        fill={payload.tone}
        stroke="var(--nx-border)"
        strokeWidth="var(--nx-stroke-hairline)"
      />
      {payload.value === null && (
        <line
          x1={Math.min(left, right) + 5}
          y1={Math.max(top, bottom) - 5}
          x2={Math.max(left, right) - 5}
          y2={Math.min(top, bottom) + 5}
          stroke="var(--nx-faint)"
          strokeWidth="var(--nx-stroke-hairline)"
        />
      )}
    </g>
  );
}

export function ObservationMatrix({
  data,
  rows,
  columns,
  domain,
  title,
  subtitle,
  unit = '',
  valueFormatter = formatNumber,
  className,
}: ObservationMatrixProps) {
  const id = useId();
  const rowHeight = rows.reduce(
    (height, row) =>
      Math.max(height, Math.ceil(row.label.length / 10) * 15 + 8),
    28,
  );
  const columnWidth = columns.reduce(
    (width, column) => Math.max(width, Math.min(160, column.label.length * 8)),
    18,
  );
  const axisHeight = columns.reduce(
    (height, column) =>
      Math.max(
        height,
        Math.ceil((column.label.length * 8) / columnWidth) * 15 + 12,
      ),
    36,
  );
  const { cells, status } = useMemo(() => {
    const unique = (axis: readonly ObservationAxis[]) =>
      axis.every((d) => d.id.trim()) &&
      new Set(axis.map((d) => d.id)).size === axis.length;
    const validDomain =
      Number.isFinite(domain[0]) &&
      Number.isFinite(domain[1]) &&
      domain[1] > domain[0] &&
      Number.isFinite(domain[1] - domain[0]);
    const key = (r: string, c: string) => JSON.stringify([r, c]);
    const lookup = new Map(
      data.map((d) => [key(d.rowId, d.columnId), d.value]),
    );
    const invalid =
      !unique(rows) ||
      !unique(columns) ||
      !validDomain ||
      lookup.size !== data.length ||
      data.some(
        (d) =>
          !rows.some((r) => r.id === d.rowId) ||
          !columns.some((c) => c.id === d.columnId) ||
          (typeof d.value === 'number' &&
            Number.isFinite(d.value) &&
            (d.value < domain[0] || d.value > domain[1])),
      );
    const cells: Cell[] = rows.flatMap((row, y) =>
      columns.map((column, x) => {
        const raw = lookup.get(key(row.id, column.id));
        const value =
          typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
        const position =
          value === null || !validDomain
            ? 0
            : ((value - domain[0]) / (domain[1] - domain[0])) * 5;
        // Decimal boundaries may round a few ULPs below their integer bin.
        const level = Math.min(
          4,
          Math.floor(
            position + Number.EPSILON * Math.max(1, Math.abs(position)) * 4,
          ),
        );
        return {
          rowId: row.id,
          columnId: column.id,
          rowLabel: row.label,
          columnLabel: column.label,
          x,
          y,
          value,
          tone: value === null ? 'var(--nx-paper)' : levels[level]!,
        };
      }),
    );
    return {
      cells,
      status: invalid
        ? 'Provide unique row and column IDs, one reading per cell, and readings within finite, increasing bounds.'
        : !rows.length || !columns.length
          ? 'No observation grid available.'
          : null,
    };
  }, [data, rows, columns, domain]);
  return (
    <VioletChartFrame
      name="observation-matrix"
      title={title}
      subtitle={subtitle}
      status={status}
      className={className}
    >
      <div className="mt-[var(--nx-space-cardBodyGap)] overflow-x-auto">
        <div
          style={{
            minWidth: columns.length * columnWidth + 90,
            height: Math.max(90, rows.length * rowHeight + axisHeight),
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 196 }}
          >
            <ScatterChart
              accessibilityLayer
              title={title}
              desc="Color follows five equal intervals of the fixed domain. A diagonal slash means unavailable. Use left and right arrow keys to inspect cells in row order."
              margin={{ top: 0, right: 1, bottom: 0, left: 0 }}
              className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]"
            >
              <XAxis
                type="number"
                dataKey="x"
                domain={[-0.5, columns.length - 0.5]}
                ticks={columns.map((_, i) => i)}
                interval={0}
                tickFormatter={(x: number) => columns[x]?.label ?? ''}
                height={axisHeight}
                tickMargin={12}
                tickSize={0}
                axisLine={false}
                tickLine={false}
                tick={(props: unknown) => {
                  const { x, y, payload } = props as {
                    x: number;
                    y: number;
                    payload: { value: number };
                  };
                  return (
                    <foreignObject
                      x={x - columnWidth / 2}
                      y={y}
                      width={columnWidth}
                      height={axisHeight - 12}
                    >
                      <div className="text-center text-[length:var(--nx-type-axis-size)] leading-[15px] [overflow-wrap:anywhere] text-[var(--nx-faint)]">
                        {columns[payload.value]?.label}
                      </div>
                    </foreignObject>
                  );
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                reversed
                domain={[-0.5, rows.length - 0.5]}
                ticks={rows.map((_, i) => i)}
                interval={0}
                tickFormatter={(y: number) => rows[y]?.label ?? ''}
                width={90}
                axisLine={false}
                tickLine={false}
                tick={(props: unknown) => {
                  const { y, payload } = props as {
                    y: number;
                    payload: { value: number };
                  };
                  return (
                    <foreignObject
                      x={0}
                      y={y - rowHeight / 2}
                      width={82}
                      height={rowHeight}
                    >
                      <div className="flex h-full items-center justify-end text-right text-[length:var(--nx-type-axis-size)] leading-[15px] [overflow-wrap:anywhere] text-[var(--nx-muted)]">
                        {rows[payload.value]?.label}
                      </div>
                    </foreignObject>
                  );
                }}
              />
              <Tooltip
                isAnimationActive={false}
                cursor={false}
                content={({ active, payload }) => {
                  const cell = payload?.[0]?.payload as Cell | undefined;
                  return active && cell ? (
                    <VioletTooltip>
                      <div>
                        {cell.rowLabel} · {cell.columnLabel}
                      </div>
                      <div>
                        {cell.value === null
                          ? 'Unavailable'
                          : `${valueFormatter(cell.value)}${unit ? ' ' + unit : ''}`}
                      </div>
                    </VioletTooltip>
                  ) : null;
                }}
              />
              <Scatter
                id={id}
                data={cells}
                isAnimationActive={false}
                shape={(props: unknown) => <CellMark props={props} />}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div
        aria-label="Color scale"
        className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap items-center gap-2 text-[length:var(--nx-type-legend-size)] text-[var(--nx-muted)]"
      >
        <span>{valueFormatter(domain[0])}</span>
        <span className="flex" aria-hidden="true">
          {levels.map((tone) => (
            <span key={tone} className="h-3 w-6" style={{ background: tone }} />
          ))}
        </span>
        <span>
          {valueFormatter(domain[1])}
          {unit ? ' ' + unit : ''}
        </span>
        <span className="ml-auto">/ Unavailable</span>
      </div>
    </VioletChartFrame>
  );
}
