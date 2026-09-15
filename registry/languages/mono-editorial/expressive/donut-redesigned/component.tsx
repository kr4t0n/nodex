'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DonutRedesignedDatum { source: string; percent: number | null }
export interface DonutRedesignedProps {
  data: readonly DonutRedesignedDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface SourcePoint extends DonutRedesignedDatum { index: number; from: number; to: number; x: number; y: number }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)'];
function SourceDots(props: unknown) {
  const { payload } = props as { payload?: SourcePoint }; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || !xScale || !yScale) return <g />;
  return <g data-nx-observation={payload.index} fill={tones[payload.index] ?? 'var(--nx-ink)'} opacity={0.8}>
    {Array.from({ length: payload.to - payload.from }, (_, offset) => {
      const cell = payload.from + offset;
      return <circle key={cell} data-nx-percent-cell={cell} cx={xScale(cell % 10)} cy={yScale(Math.floor(cell / 10))} r={7.5} />;
    })}
  </g>;
}

/** The original hundred-dot redesign: one real source observation owns each contiguous allocation. */
export function DonutRedesigned({ data, height, width, animate = true, className = '', 'aria-label': label = 'Sign-up shares by source' }: DonutRedesignedProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const sources = useMemo(() => {
    let placed = 0;
    return data.map((row, index): SourcePoint => {
      const percent = row.percent !== null && Number.isSafeInteger(row.percent) && row.percent >= 0 && row.percent <= 100 ? row.percent : null;
      const from = placed; placed += percent ?? 0; const middle = Math.min(99, from + Math.floor((percent ?? 0) / 2));
      return { source: row.source, percent, index, from, to: placed, x: middle % 10, y: Math.floor(middle / 10) };
    });
  }, [data]);
  const available = sources.length > 0 && sources.every(row => row.percent !== null) && sources.reduce((sum, row) => sum + (row.percent ?? 0), 0) === 100;
  return <div ref={ref} className={`nx-donut-redesigned flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="donut-redesigned" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete sign-up allocation available.</div> : <div className={height === undefined ? 'relative aspect-[620/300] min-h-[240px] w-full' : 'relative min-h-0 flex-1'}>
      <div className="absolute inset-y-0 left-[4%] w-1/2">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 270, height: 261 }}>
          <ScatterChart accessibilityLayer title={label} desc="A ten by ten grid contains one dot per percent. Tone follows source order. Use the left and right arrow keys to inspect sources, including zero shares."
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 16, bottom: 16, left: 0, right: 0 }}>
            <XAxis dataKey="x" type="number" hide domain={[-0.6, 9.6]} />
            <YAxis dataKey="y" type="number" hide domain={[-0.6, 9.6]} reversed />
            <Tooltip cursor={false} isAnimationActive={false} allowEscapeViewBox={{ x: true }} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as SourcePoint | undefined;
              return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.source} — {row.percent}% of sign-ups</div> : null;
            }} />
            <Scatter id={`${id}-sources`} data={sources} name="Sign-up sources" fill="var(--nx-ink)" shape={SourceDots} activeShape={SourceDots} {...motion} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-y-4 left-[calc(60%_-_12px)] right-[6%] grid items-center" style={{ gridTemplateRows: `repeat(${sources.length}, minmax(0, 1fr))` }}>
        {sources.map(row => <div key={row.index} className="grid grid-cols-[12px_minmax(0,1fr)_max-content] items-center gap-x-3">
          <div data-nx-swatch={row.index} className="size-3 rounded-full" style={{ background: tones[row.index] ?? 'var(--nx-ink)' }} />
          <div data-nx-source={row.index} className="min-w-0 wrap-break-word text-left text-[length:calc(var(--nx-type-legend-size)*10.5/9)] font-[number:var(--nx-type-legend-weight)] leading-snug">{row.source}</div>
          <div data-nx-share={row.index} className="whitespace-nowrap text-right text-[length:calc(var(--nx-type-plotValue-size)*15/17)] font-[number:var(--nx-type-pageTitle-weight)] leading-none" style={{ color: row.index < 2 ? 'var(--nx-ink)' : 'var(--nx-muted)' }}>{row.percent}%</div>
        </div>)}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE DOT = ONE PERCENT OF SIGN-UPS</div>
    </div>}
  </div>;
}
