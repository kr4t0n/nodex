'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface BrandSpectrumDatum {
  left: string;
  right: string;
  /** Positions range from zero (left trait) to one (right trait). */
  us: number | null;
  competitors: readonly (number | null)[];
}
export interface BrandSpectrumProps {
  data: readonly BrandSpectrumDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface BrandPoint { index: string; row: number; value: number; who: 'us' | 'competitor'; right: string }

function BrandMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: BrandPoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <g data-nx-observation={payload.index}><circle data-nx-brand={payload.who} cx={cx} cy={cy} r={payload.who === 'us' ? 8 : 3.2}
    fill={payload.who === 'us' ? 'var(--nx-ink)' : 'var(--nx-muted)'} opacity={0.8} /></g>;
}

function TraitTracks({ observations }: { observations: readonly BrandSpectrumDatum[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const area = usePlotArea();
  const from = xScale?.(0);
  const to = xScale?.(1);
  if (from === undefined || to === undefined || !yScale || !area) return null;
  return <g aria-hidden="true" pointerEvents="none">{observations.map((point, index) => {
    const y = yScale(index);
    if (y === undefined) return null;
    return <g key={index}>
      <line data-nx-trait-track={index} x1={from} x2={to} y1={y} y2={y} stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-mark)" />
      {[from, to].map((x, side) => <line key={side} x1={x} x2={x} y1={y - 4.5} y2={y + 4.5} stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-mark)" />)}
      <text x={area.x - 14} y={y} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-axis-weight)">{point.left}</text>
      <text x={area.x + area.width + 86} y={(index + 0.5) / observations.length * (area.height + 82)} dy={4} textAnchor="end" dominantBaseline="central"
        fill="var(--nx-markMuted)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-axis-weight)">{point.right}</text>
    </g>;
  })}</g>;
}

/** One scale per trait, with observation-sized marks for us and each competitor. */
export function BrandSpectrum({ data, height, width, animate = true, className = '', 'aria-label': label = 'Brand position between opposing traits' }: BrandSpectrumProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    const result: BrandPoint[] = [];
    for (const [row, point] of data.entries()) {
      for (const [index, value] of point.competitors.entries()) if (value !== null && Number.isFinite(value) && value >= 0 && value <= 1) result.push({ index: `${row}:competitor:${index}`, row, value, who: 'competitor', right: point.right });
      if (point.us !== null && Number.isFinite(point.us) && point.us >= 0 && point.us <= 1) result.push({ index: `${row}:us`, row, value: point.us, who: 'us', right: point.right });
    }
    return result;
  }, [data]);
  return <div ref={ref} className={`nx-brand-spectrum flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="brand-spectrum" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Large dots show our position and small dots show competitors between opposing traits. Use the left and right arrow keys to inspect each position."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 104, bottom: 48, left: 104 }}>
          <XAxis dataKey="value" type="number" hide domain={[-0.02, 1.02]} />
          <YAxis dataKey="row" type="number" hide reversed domain={[-0.5, data.length - 0.5]} />
          <TraitTracks observations={data} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as BrandPoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.who === 'us' ? 'us' : 'a competitor'} — {Math.round(point.value * 100)}% toward {point.right}</div> : null;
          }} />
          <Scatter id={`${id}-positions`} data={points} name="Positions" fill="var(--nx-ink)" shape={BrandMark} activeShape={BrandMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7.5/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">LARGE DOT = US · SMALL DOTS = COMPETITORS{data.every((point) => point.competitors.length === 3) ? ' A · B · C' : ''}</div>
    </div>}
  </div>;
}
