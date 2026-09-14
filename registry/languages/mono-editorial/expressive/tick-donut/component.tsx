'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, useXAxisScale, useYAxisScale } from 'recharts';
import { RadialTallyAxes, RadialTallyMarks } from '../../../../_shared/radial-tally-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface TickDonutDatum { channel: string; percent: number | null }
export interface TickDonutProps {
  data: readonly TickDonutDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface ChannelPoint extends TickDonutDatum { index: number; from: number; to: number; x: number; y: number }
const tones = ['var(--nx-ink)', 'var(--nx-markDeep)', 'var(--nx-muted)', 'var(--nx-markQuiet)'];
function ChannelTicks(props: unknown) {
  const { payload } = props as { payload?: ChannelPoint }; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || !xScale || !yScale) return <g />;
  return <g data-nx-observation={payload.index}>
    <RadialTallyMarks from={payload.from} to={payload.to} radius={64} startAngle={-90} stepAngle={3.6} length={[10, 6]} seed={payload.index + 2} x={xScale} y={yScale} stroke={tones[payload.index] ?? 'var(--nx-ink)'} thickness="var(--nx-stroke-mark)" series={payload.index} />
  </g>;
}
function CountingBeads() {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => {
    const angle = (index * 36 - 90) * Math.PI / 180;
    return <circle key={index} data-nx-counting-bead={index * 10} cx={xScale(59 * Math.cos(angle))} cy={yScale(-59 * Math.sin(angle))} r={0.8} fill="var(--nx-faint)" opacity={0.8} />;
  })}</g>;
}

/** One inspectable channel generates its exact share of the hundred radial ticks. */
export function TickDonut({ data, height, width, animate = true, className = '', 'aria-label': label = 'Traffic shares by channel' }: TickDonutProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const channels = useMemo(() => {
    let placed = 0;
    return data.map((row, index): ChannelPoint => {
      const percent = row.percent !== null && Number.isSafeInteger(row.percent) && row.percent >= 0 && row.percent <= 100 ? row.percent : null;
      const from = placed; placed += percent ?? 0;
      const angle = ((from + (percent ?? 0) / 2) * 3.6 - 90) * Math.PI / 180;
      return { channel: row.channel, percent, index, from, to: placed, x: 70 * Math.cos(angle), y: -70 * Math.sin(angle) };
    });
  }, [data]);
  const available = channels.length > 0 && channels.every(row => row.percent !== null) && channels.reduce((sum, row) => sum + (row.percent ?? 0), 0) === 100;
  return <div ref={ref} className={`nx-tick-donut flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="tick-donut" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete traffic allocation available.</div> : <div className={height === undefined ? 'relative aspect-[560/380] min-h-[304px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 366 }}>
        <ScatterChart accessibilityLayer title={label} desc="One tick is one percent; a bead marks every tenth. Use the left and right arrow keys to inspect channels, including zero shares."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 14, bottom: 40, left: 0, right: 0 }}>
          <RadialTallyAxes extent={90} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as ChannelPoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.channel} — {row.percent}% of traffic</div> : null;
          }} />
          <Scatter id={`${id}-channels`} data={channels} name="Traffic channels" fill="var(--nx-ink)" shape={ChannelTicks} activeShape={ChannelTicks} {...motion} />
          <CountingBeads />
        </ScatterChart>
      </ResponsiveContainer>
      {channels.map(row => <div key={row.index} className="pointer-events-none absolute bottom-0" style={{ left: `${8 + row.index * 92 / channels.length}%` }}>
        <div data-nx-channel={row.index} className="absolute bottom-5 whitespace-nowrap text-[length:calc(var(--nx-type-legend-size)*7.5/9)] font-[number:var(--nx-type-cardTitle-weight)] leading-none" style={{ color: tones[row.index] ?? 'var(--nx-ink)' }}>{row.channel}</div>
        <div data-nx-share={row.index} className="absolute bottom-1.5 text-[length:calc(var(--nx-type-plotValue-size)*12/17)] font-[number:var(--nx-type-pageTitle-weight)] leading-none" style={{ color: row.index < 2 ? 'var(--nx-ink)' : 'var(--nx-muted)' }}>{row.percent}%</div>
      </div>)}
    </div>}
  </div>;
}
