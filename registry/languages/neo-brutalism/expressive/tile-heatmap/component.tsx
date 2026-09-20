'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { NeoChartFrame, NeoChartTooltip } from '../../../../_shared/neo-chart-frame';

export interface TileHeatmapAxis { id: string; label: string }
export interface TileHeatmapDatum { rowId: string; columnId: string; value: number | null }
export interface TileHeatmapProps {
  data: readonly TileHeatmapDatum[]; rows: readonly TileHeatmapAxis[]; columns: readonly TileHeatmapAxis[];
  /** Fixed intensity ceiling. Out-of-range readings are unavailable, never silently clamped. */
  maxValue: number; unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Tile { id: string; rowLabel: string; columnLabel: string; x: number; y: number; value: number | null; intensity: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => number.format(value);

function TileMark({ payload, cx, cy, columns, rows }: { payload?: Tile; cx?: number; cy?: number; columns: number; rows: number }) {
  const plot = usePlotArea();
  if (!payload || cx === undefined || cy === undefined || !plot) return <g />;
  const width = Math.max(1, plot.width / columns - 8); const height = Math.max(1, plot.height / rows - 8);
  return <g data-nx-tile={payload.id} data-nx-value={payload.value ?? 'missing'}>
    <rect x={cx - width / 2} y={cy - height / 2} width={width} height={height} fill="var(--nx-bg)" />
    <rect data-nx-tile-fill={payload.id} x={cx - width / 2} y={cy - height / 2} width={width} height={height}
      fill="var(--nx-valueFill)" fillOpacity={payload.value === null ? 0 : payload.intensity} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-hairline)" />
    {payload.value === null ? <g stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-hairline)"><line x1={cx - 4} x2={cx + 4} y1={cy - 4} y2={cy + 4} /><line x1={cx - 4} x2={cx + 4} y1={cy + 4} y2={cy - 4} /></g>
      : payload.value === 0 && <circle cx={cx} cy={cy} r={2} fill="var(--nx-ink)" />}
  </g>;
}

/** Fixed blue intensity is quantitative; the categorical accent palette is never used as a ramp. */
export function TileHeatmap({ data, rows, columns, maxValue, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Values across rows and columns' }: TileHeatmapProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { tiles, valid } = useMemo(() => {
    const unique = (items: readonly TileHeatmapAxis[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
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
    : !tiles.some(tile => tile.value !== null) ? 'No cell observations available.' : null;
  return <NeoChartFrame ref={ref} name="tile-heatmap" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-auto ${height === undefined ? '' : 'min-h-0 flex-1'}`}>
      <div style={{ minWidth: Math.max(360, columns.length * 58 + 90), height: Math.max(260, rows.length * 64 + 44) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 300 }}>
          <ScatterChart accessibilityLayer title={label} desc={`Darker blue means a larger ${unitLabel} reading on a fixed zero-to-${maxValue} scale. A dot is measured zero; a cross is missing or out of range. Use left and right arrow keys to inspect cells in row order.`}
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }} className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <XAxis dataKey="x" type="number" domain={[-0.5, columns.length - 0.5]} ticks={columns.map((_, index) => index)} interval={0} height={36} axisLine={false} tickLine={false} tickMargin={12}
              tickFormatter={(index: number) => columns[index]?.label ?? ''} tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-font-weight-bold)' }} />
            <YAxis dataKey="y" type="number" reversed domain={[-0.5, rows.length - 0.5]} ticks={rows.map((_, index) => index)} interval={0} width={82} axisLine={false} tickLine={false} tickMargin={10}
              tickFormatter={(index: number) => rows[index]?.label ?? ''} tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-font-weight-bold)' }} />
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const tile = payload?.[0]?.payload as Tile | undefined;
              return active && tile ? <NeoChartTooltip title={`${tile.rowLabel} · ${tile.columnLabel}`}><div>{tile.value === null ? 'Unavailable' : `${valueFormatter(tile.value)} ${unitLabel}`}</div></NeoChartTooltip> : null;
            }} />
            <Scatter id={`${id}-tiles`} data={tiles} fill="var(--nx-valueFill)" shape={(props: unknown) => <TileMark {...props as { payload?: Tile; cx?: number; cy?: number }} columns={columns.length} rows={rows.length} />}
              activeShape={(props: unknown) => <TileMark {...props as { payload?: Tile; cx?: number; cy?: number }} columns={columns.length} rows={rows.length} />} {...motion} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
      <span>Dot: zero · Cross: unavailable</span>
      <span className="flex items-center gap-2">0{[0, 0.25, 0.5, 0.75, 1].map(value => <span key={value} className="relative h-4 w-4 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)]"><span className="absolute inset-0 bg-[var(--nx-valueFill)]" style={{ opacity: value }} /></span>)}{valueFormatter(maxValue)}</span>
    </div>
  </NeoChartFrame>;
}
