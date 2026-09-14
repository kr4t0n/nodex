'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { constrainedCurve } from '../../../../_shared/constrained-curve';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DynamicDataDatum { sample: string; usersK: number | null }
export interface DynamicDataProps {
  data: readonly DynamicDataDatum[];
  sourceStatus: string;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface SamplePoint extends DynamicDataDatum { index: number }
const smoothing = constrainedCurve(0.45);
function CurrentValue({ last, floor }: { last: SamplePoint; floor: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <text data-nx-current x={(xScale(last.index) ?? 0) + 8} y={yScale(last.usersK ?? floor)} dominantBaseline="central" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 14 / 17)" fontWeight="var(--nx-type-pageTitle-weight)" pointerEvents="none">{last.usersK === null ? '—' : `${last.usersK}k`}</text>;
}

/** Caller updates supply the feed; a native Area owns its scales, curves and interactions. */
export function DynamicData({ data, sourceStatus, height, width, animate = true, className = '', 'aria-label': label = 'Concurrent users over the supplied window' }: DynamicDataProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((row, index): SamplePoint => ({ sample: row.sample, usersK: row.usersK !== null && Number.isFinite(row.usersK) && row.usersK >= 0 ? row.usersK : null, index })), [data]);
  const values = rows.flatMap(row => row.usersK === null ? [] : [row.usersK]); const available = values.length > 0;
  const floor = Math.min(20, ...values); const ceiling = Math.max(130, ...values); const last = rows.at(-1);
  return <div ref={ref} className={`nx-dynamic-data flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="dynamic-data" data-nx-animated={motion.isAnimationActive}>
    {!available || !last ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No active-user readings available.</div> : <div className={height === undefined ? 'relative aspect-[580/320] min-h-[256px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <AreaChart data={rows} accessibilityLayer title={label} desc="The final label is the last supplied sample. Missing readings leave gaps. Use the left and right arrow keys to inspect samples. The source badge is static."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 44, bottom: 20, left: 14, right: 58 }}>
          <defs><linearGradient id={`${id}-wash`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--nx-ink)" stopOpacity={0.16} /><stop offset="100%" stopColor="var(--nx-ink)" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="index" type="number" hide domain={rows.length === 1 ? [-0.5, 0.5] : [0, rows.length - 1]} />
          <YAxis type="number" hide domain={[floor, ceiling]} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const row = typeof index === 'number' ? rows[index] : undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.sample} — {row.usersK === null ? 'Unavailable' : `${row.usersK}k users`}</div> : null;
          }} />
          <Area id={`${id}-samples`} className="nx-user-area" dataKey="usersK" name="Active users" type={smoothing} baseValue={floor} connectNulls={false} stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-emphasis)' }} fill={`url(#${id}-wash)`} fillOpacity={1}
            dot={rows.length === 1 ? { r: 2.2, fill: 'var(--nx-ink)', stroke: 'none' } : false} activeDot={false} {...motion} />
          <CurrentValue last={last} floor={floor} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute left-4 top-2.5 flex items-center gap-2 text-[length:calc(var(--nx-type-legend-size)*11/9)] font-[number:var(--nx-type-pageTitle-weight)] leading-none"><span className="size-2 rounded-full bg-[var(--nx-markStrong)]" /><span data-nx-source-status>{sourceStatus}</span></div>
    </div>}
  </div>;
}
