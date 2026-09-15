'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, Curve, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface PictorialBarDatum { year: string; treesK: number | null }
export interface PictorialBarProps {
  data: readonly PictorialBarDatum[];
  targetK: number;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface TreeRow extends PictorialBarDatum { index: number; tone: string }
const tones = ['var(--nx-markQuiet)', 'var(--nx-muted)', 'var(--nx-markMuted)', 'var(--nx-markStrong)', 'var(--nx-ink)'];
const tree: readonly (readonly [number, number])[] = [[20, 0], [38, 28], [29, 28], [40, 46], [26, 46], [26, 58], [14, 58], [14, 46], [0, 46], [11, 28], [2, 28]];
function nearCeil(value: number) { const rounded = Math.round(value); return Math.abs(value - rounded) < 1e-4 ? rounded : Math.ceil(value); }
function repeatLayout(span: number) {
  const count = Math.max(1, nearCeil((span + 6) / 23));
  const gap = (span - count * 17) / Math.max(count - 1, 1);
  return { count, gap, pitch: 17 + gap };
}
function filledCount(width: number, layout: ReturnType<typeof repeatLayout>) { return width > 0 && layout.pitch > 0 ? Math.max(0, nearCeil((width + layout.gap) / layout.pitch)) : 0; }
function TreeGlyph({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <Curve data-nx-tree points={tree.map(([px, py]) => ({ x: x + px * 17 / 40, y: y - 12 + py * 24 / 58 }))} type="linearClosed" fill={fill} stroke="none" />;
}
function TreeTrack({ rows, ceiling, target, id }: { rows: readonly TreeRow[]; ceiling: number; target: number; id: string }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  const left = xScale(0) ?? 0; const span = (xScale(ceiling) ?? left) - left; const layout = repeatLayout(span);
  return <g pointerEvents="none" aria-hidden="true">{rows.filter(row => row.treesK !== null).map(row => {
    const cy = yScale(row.index, { position: 'middle' }) ?? 0; const clip = `${id}-track-${row.index}`;
    return <g key={row.index} data-nx-track={row.index}>
      <defs><clipPath id={clip}><rect x={left} y={cy - 20} width={Math.max(0, (xScale(target) ?? left) - left)} height={40} fill="var(--nx-ink)" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>{Array.from({ length: layout.count }, (_, i) => <TreeGlyph key={i} x={left + i * layout.pitch} y={cy} fill="var(--nx-grid)" />)}</g>
    </g>;
  })}</g>;
}
function PlantedTrees({ payload, width = 0, ceiling, id }: BarShapeProps & { ceiling: number; id: string }) {
  const row = payload as TreeRow; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale || row.treesK === null) return <g />;
  const left = xScale(0) ?? 0; const cy = yScale(row.index, { position: 'middle' }) ?? 0;
  const layout = repeatLayout((xScale(ceiling) ?? left) - left); const count = filledCount(width, layout); const clip = `${id}-planted-${row.index}`;
  return <g data-nx-observation={row.index}>
    <defs><clipPath id={clip}><rect data-nx-planting-clip={row.index} x={left} y={cy - 20} width={Math.max(0, width)} height={40} fill="var(--nx-ink)" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}>{Array.from({ length: count }, (_, i) => <TreeGlyph key={i} x={left + i * layout.pitch} y={cy} fill={row.tone} />)}</g>
  </g>;
}
function PlantingTotal({ value, rows, ceiling }: LabelProps & { rows: readonly TreeRow[]; ceiling: number }) {
  const row = typeof value === 'number' ? rows[value] : undefined; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!row || !xScale || !yScale) return <g />;
  const left = xScale(0) ?? 0; const layout = repeatLayout((xScale(ceiling) ?? left) - left);
  const count = filledCount((xScale(row.treesK ?? 0) ?? left) - left, layout); const extent = count ? count * layout.pitch - layout.gap : 0;
  return <text data-nx-total={row.index} x={left + extent + 13} y={yScale(row.index, { position: 'middle' })} dominantBaseline="central" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 12 / 17)" fontWeight="var(--nx-type-cardTitle-weight)" pointerEvents="none">{row.treesK === null ? '—' : `${row.treesK}k`}</text>;
}

/** A continuous Bar clips a repeated tree texture against a caller-owned target. */
export function PictorialBar({ data, targetK, height, width, animate = true, className = '', 'aria-label': label = 'Trees planted by year' }: PictorialBarProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): TreeRow => ({ year: row.year, treesK: row.treesK !== null && Number.isFinite(row.treesK) && row.treesK >= 0 ? row.treesK : null, index, tone: tones[Math.min(4, index)]! })), [data]);
  const available = Number.isFinite(targetK) && targetK > 0 && rows.some(row => row.treesK !== null);
  const ceiling = Math.max(targetK, ...rows.map(row => row.treesK ?? 0));
  return <div ref={ref} className={`nx-pictorial-bar flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="pictorial-bar" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No planting counts or target available.</div> : <div className={height === undefined ? 'relative aspect-[580/320] min-h-[256px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <BarChart layout="vertical" data={rows} accessibilityLayer title={label} desc="Tree-pattern bar length shows thousands planted against a shared target; individual glyphs are decorative. Use ArrowLeft to advance to the next year and ArrowRight to return."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 10, right: 56, bottom: 8, left: 0 }}>
          <XAxis type="number" hide domain={[0, ceiling]} />
          <YAxis dataKey="index" type="category" scale="band" width={44} interval={0} axisLine={false} tickLine={false} tickSize={0} tickMargin={8}
            tick={({ x, y, payload }) => <text x={x} y={y} textAnchor="end" dominantBaseline="central" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 10.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{rows[payload.value]?.year ?? ''}</text>} />
          <TreeTrack rows={rows} ceiling={ceiling} target={targetK} id={id} />
          {rows.filter(row => row.treesK === null).map(row => <PlantingTotal key={row.index} value={row.index} rows={rows} ceiling={ceiling} />)}
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const row = typeof index === 'number' ? rows[index] : undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.year} — {row.treesK === null ? 'Unavailable' : `${row.treesK}k trees`}</div> : null;
          }} />
          <Bar id={`${id}-trees`} dataKey="treesK" name="Trees planted" fill="var(--nx-ink)" stroke="none" shape={props => <PlantedTrees {...props} ceiling={ceiling} id={id} />} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<PlantingTotal rows={rows} ceiling={ceiling} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
