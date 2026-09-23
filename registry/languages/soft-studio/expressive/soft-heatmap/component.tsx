'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftHeatmapAxis { id: string; label: string }
export interface SoftHeatmapDatum { rowId: string; columnId: string; value: number | null }
export interface SoftHeatmapProps {
  data: readonly SoftHeatmapDatum[]; rows: readonly SoftHeatmapAxis[]; columns: readonly SoftHeatmapAxis[];
  /** Fixed positive ceiling; out-of-range readings are unavailable. */
  maxValue: number; unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}

interface Tile { id: string; rowLabel: string; columnLabel: string; x: number; y: number; value: number | null; intensity: number }
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => numbers.format(value);

function TileMark({ payload, cx, cy, columns, rows }: { payload?: Tile; cx?: number; cy?: number; columns: number; rows: number }) {
  const plot = usePlotArea();
  if (!payload || cx === undefined || cy === undefined || !plot) return <g />;
  const width = Math.max(1, plot.width / columns - 8); const height = Math.max(1, plot.height / rows - 8);
  const bounds = { x: cx - width / 2, y: cy - height / 2, width, height, style: { rx: 'var(--nx-radius-heatCell)', ry: 'var(--nx-radius-heatCell)' } };
  return <g data-nx-soft-cell={payload.id} data-nx-value={payload.value ?? 'missing'}>
    <rect {...bounds} fill="var(--nx-fieldFill)" />
    <rect {...bounds} data-nx-soft-intensity={payload.id} fill="var(--nx-heatFill)" fillOpacity={payload.intensity} />
    {payload.value === null ? <g aria-hidden="true" stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)">
      <line x1={cx - 3} x2={cx + 3} y1={cy - 3} y2={cy + 3} /><line x1={cx - 3} x2={cx + 3} y1={cy + 3} y2={cy - 3} />
    </g> : payload.value === 0 && <circle aria-hidden="true" cx={cx} cy={cy} r={2} fill="var(--nx-ink)" />}
  </g>;
}

/** Rounded cells on native numeric scales; tint encodes value against a caller-owned ceiling. */
export function SoftHeatmap({ data, rows, columns, maxValue, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Values across rows and columns' }: SoftHeatmapProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { tiles, valid } = useMemo(() => {
    const unique = (items: readonly SoftHeatmapAxis[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    let valid = unique(rows) && unique(columns);
    const rowIds = new Set(rows.map(row => row.id)); const columnIds = new Set(columns.map(column => column.id));
    const readings = new Map<string, number | null>();
    for (const datum of data) {
      const key = JSON.stringify([datum.rowId, datum.columnId]);
      if (!rowIds.has(datum.rowId) || !columnIds.has(datum.columnId) || readings.has(key)) valid = false;
      readings.set(key, datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 && datum.value <= maxValue ? datum.value : null);
    }
    const tiles = rows.flatMap((row, y) => columns.map((column, x): Tile => {
      const id = JSON.stringify([row.id, column.id]); const value = readings.get(id) ?? null;
      return { id, rowLabel: row.label, columnLabel: column.label, x, y, value, intensity: value === null ? 0 : value / maxValue };
    }));
    return { tiles, valid };
  }, [data, rows, columns, maxValue]);
  const status = !Number.isFinite(maxValue) || maxValue <= 0 ? 'A finite, positive scale maximum is required.'
    : !valid ? 'Use unique axis IDs and one reading per declared row and column pair.'
    : !tiles.length ? 'Declare rows and columns to compare.' : null;

  return <StudioChartFrame ref={ref} name="soft-heatmap" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    {!tiles.some(tile => tile.value !== null) && <p role="status" className="mt-3 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">No cell observations available.</p>}
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-auto ${height === undefined ? '' : 'min-h-0 flex-1'}`}>
      <div style={{ minWidth: Math.max(300, columns.length * 54 + 86), height: Math.max(224, rows.length * 48 + 36) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
          <ScatterChart accessibilityLayer title={label}
            desc={`Darker cells mean larger ${unitLabel} on a fixed zero-to-${maxValue} scale. A dot means measured zero; a cross means missing or out of range. Use left and right arrow keys to inspect every cell in row order.`}
            margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <XAxis dataKey="x" type="number" domain={[-0.5, columns.length - 0.5]} ticks={columns.map((_, index) => index)} interval={0}
              height={36} tickMargin={12} axisLine={false} tickLine={false} tickFormatter={(index: number) => columns[index]?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <YAxis dataKey="y" type="number" reversed domain={[-0.5, rows.length - 0.5]} ticks={rows.map((_, index) => index)} interval={0}
              width={82} tickMargin={10} axisLine={false} tickLine={false} tickFormatter={(index: number) => rows[index]?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const tile = payload?.[0]?.payload as Tile | undefined;
              return active && tile ? <StudioChartTooltip title={`${tile.rowLabel} · ${tile.columnLabel}`}>{tile.value === null ? 'Unavailable' : `${valueFormatter(tile.value)} ${unitLabel}`}</StudioChartTooltip> : null;
            }} />
            <Scatter id={`${id}-cells`} data={tiles} fill="var(--nx-heatFill)" activeShape={false}
              shape={(props: unknown) => <TileMark {...props as { payload?: Tile; cx?: number; cy?: number }} columns={columns.length} rows={rows.length} />} {...motion} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span>Dot: zero · Cross: unavailable</span>
      <span aria-label={`Intensity scale: 0 to ${valueFormatter(maxValue)}`} className="flex items-center gap-2">
        0{[0, 0.25, 0.5, 0.75, 1].map(value => <span aria-hidden="true" key={value} className="relative h-3 w-3 overflow-hidden rounded bg-[var(--nx-fieldFill)]"><span className="absolute inset-0 bg-[var(--nx-heatFill)]" style={{ opacity: value }} /></span>)}{valueFormatter(maxValue)}
      </span>
    </div>
  </StudioChartFrame>;
}
