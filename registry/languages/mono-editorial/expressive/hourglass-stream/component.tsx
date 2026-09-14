'use client';

import { useId, useMemo } from 'react';
import { Curve, Rectangle, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface HourglassStreamDatum { stage: string; people: number | null }
export interface HourglassStreamProps {
  data: readonly HourglassStreamDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface StagePoint { stage: string; people: number | null; index: number; x: number; y: number; half: number | null }
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
function StageStrip(props: unknown) {
  const { payload, cx, cy, isAnimating, animationElapsedTime } = props as { payload?: StagePoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number }; const xScale = useXAxisScale();
  if (!payload || cx === undefined || cy === undefined || !xScale) return <g />;
  const ticks = Math.round((payload.people ?? 0) / 40); const half = payload.half ?? 0; const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  return <g data-nx-observation={payload.index}>
    {Array.from({ length: ticks }, (_, index) => { const value = -half + (index + 0.5) / ticks * half * 2 + (random(index + 1, payload.index + 3) - 0.5) * 3;
      return <Rectangle key={index} data-nx-population-tick={`${payload.index}-${index}`} data-nx-stage={payload.index} x={(xScale(value) ?? 0) - 0.45} y={cy - 6 * progress} width={0.9} height={12 * progress} fill="var(--nx-ink)" stroke="none" opacity={0.45 + random(index + 2, payload.index + 5) * 0.5} />;
    })}
    <text data-nx-stage-label={payload.index} x={cx + 4} y={cy - 8.5} dominantBaseline="hanging" fill="var(--nx-markStrong)" fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)" opacity={0.8}>{payload.stage}<tspan data-nx-stage-count={payload.index} x={cx + 4} dy={9} fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 9.5 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{payload.people === null ? '—' : payload.people.toLocaleString('en-US')}</tspan></text>
  </g>;
}
function FunnelGuides({ rows }: { rows: readonly StagePoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const point = (x: number, y: number) => ({ x: xScale(x) ?? 0, y: yScale(y) ?? 0 });
  return <g pointerEvents="none" aria-hidden="true">
    {rows.slice(0, -1).map((row, index) => {
      const next = rows[index + 1]!; const available = row.people !== null && row.people > 0 && next.people !== null; const rate = available ? Math.round(next.people! / row.people! * 100) : null;
      const top = row.y - 8; const bottom = next.y + 8;
      return <g key={row.index}>
        {row.people !== null && row.people > 0 && next.people !== null && next.people > 0 && Array.from({ length: 34 }, (_, thread) => {
          const xt = (random(thread + 1, index * 7 + 1) - 0.5) * 2 * row.half! * 0.94; const xb = (random(thread + 3, index * 7 + 5) - 0.5) * 2 * next.half! * 0.94;
          const points = Array.from({ length: 15 }, (_, step) => { const t = step / 14; const a = (1 - t) ** 3; const b = 3 * (1 - t) ** 2 * t; const c = 3 * (1 - t) * t * t; const d = t ** 3; return point((a + b) * xt + (c + d) * xb, a * top + b * (top - 26) + c * (bottom + 26) + d * bottom); });
          return <Curve key={thread} data-nx-funnel-thread={`${index}-${thread}`} points={points} type="linear" fill="none" stroke="var(--nx-markQuiet)" strokeWidth="calc(var(--nx-stroke-mark) / 2)" opacity={0.32} />;
        })}
        <text data-nx-through={index} x={(xScale(-152) ?? 0) - 2} y={(yScale((row.y + next.y) / 2) ?? 0) - 7.25} textAnchor="end" dominantBaseline="hanging" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-plotValue-size) / 2)" fontWeight="var(--nx-type-pageTitle-weight)" opacity={0.8}>{rate === null ? '—' : `${rate}%`}<tspan x={(xScale(-152) ?? 0) - 2} dy={9} fill="var(--nx-faint)" fontSize="calc(var(--nx-type-note-size) * 6 / 11)" fontWeight="var(--nx-type-legend-weight)">GET THROUGH</tspan></text>
      </g>;
    })}
    {rows.filter(row => row.half !== null).map(row => <Curve key={row.index} data-nx-stage-leader={row.index} points={[point(row.half! + 6, row.y), point(166, row.y)]} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-mark) * 0.8)" />)}
  </g>;
}

/** Stage observations own their calibrated tick strips; connecting threads remain illustrative guides. */
export function HourglassStream({ data, height, width, animate = true, className = '', 'aria-label': label = 'People progressing through stages' }: HourglassStreamProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => {
    const values = data.map(row => ({ stage: row.stage, people: typeof row.people === 'number' && Number.isSafeInteger(row.people) && row.people >= 0 ? row.people : null }));
    const maximum = Math.max(1, ...values.map(row => row.people ?? 0));
    return values.map((row, index): StagePoint => ({ ...row, index, x: 170, y: -index * 64, half: row.people === null ? null : row.people / maximum * 145 }));
  }, [data]);
  const available = rows.some(row => row.people !== null);
  return <div ref={ref} className={`nx-hourglass-stream flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="hourglass-stream" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No stage populations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Strip width shows relative population; ticks round to the nearest forty people and labels give exact counts. Threads illustrate progression; adjacent labels show actual conversion rates. A zero denominator makes conversion unavailable. Use the left and right arrow keys to inspect stages."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 22, bottom: 26, left: 74, right: 96 }}>
          <XAxis dataKey="x" type="number" hide domain={[-152, 170]} />
          <YAxis dataKey="y" type="number" hide domain={[-(rows.length - 1) * 64 - 26, 26]} />
          <FunnelGuides rows={rows} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as StagePoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.stage} — {row.people === null ? 'Unavailable' : row.people.toLocaleString('en-US')}</div> : null;
          }} />
          <Scatter id={`${id}-stages`} data={rows} name="Stages" fill="var(--nx-ink)" shape={StageStrip} activeShape={StageStrip} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-muted)]">ONE TICK = 40 PEOPLE</div>
    </div>}
  </div>;
}
