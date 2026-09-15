'use client';

import { useId } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, useXAxisScale, useYAxisScale } from 'recharts';
import { RadialTallyAxes, RadialTallyMarks } from '../../../../_shared/radial-tally-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface TickGaugeDatum { percent: number | null; goalLabel: string }
export interface TickGaugeProps {
  data: TickGaugeDatum | null;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface ProgressPoint { percent: number; x: number; y: number }
function ProgressTicks(props: unknown) {
  const { payload } = props as { payload?: ProgressPoint }; const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || !xScale || !yScale) return <g />;
  return <g data-nx-observation="progress">
    <RadialTallyMarks from={payload.percent} to={100} radius={104} startAngle={-195} stepAngle={2.1} length={[5, 2.5]} seed={7} x={xScale} y={yScale} stroke="var(--nx-markUnselected)" thickness="calc(var(--nx-stroke-hairline) * 6 / 7)" series="remaining" />
    <RadialTallyMarks to={payload.percent} radius={104} startAngle={-195} stepAngle={2.1} length={[13, 6]} seed={3} x={xScale} y={yScale} stroke="var(--nx-ink)" thickness="var(--nx-stroke-mark)" series="reached" />
  </g>;
}
function ScaleMarks() {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true">{[25, 50, 75, 100].map(percent => {
    const angle = (-195 + percent * 2.1) * Math.PI / 180; const x = xScale(97 * Math.cos(angle)); const y = yScale(-97 * Math.sin(angle));
    return <g key={percent} data-nx-scale-mark={percent} opacity={0.8}><circle cx={x} cy={y} r={1} fill="var(--nx-markQuiet)" /><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="var(--nx-faint)" fontSize="calc(var(--nx-type-axis-size) * 7 / 8)" fontWeight="var(--nx-type-legend-weight)">{percent}</text></g>;
  })}</g>;
}

/** One measured progress observation owns a hundred reached/remaining tally marks. */
export function TickGauge({ data, height, width, animate = true, className = '', 'aria-label': label = 'Progress toward a goal' }: TickGaugeProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const percent = data?.percent; const available = typeof percent === 'number' && Number.isSafeInteger(percent) && percent >= 0 && percent <= 100;
  return <div ref={ref} className={`nx-tick-gauge flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="tick-gauge" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No progress reading available.</div> : <div className={height === undefined ? 'relative aspect-[560/360] min-h-[288px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 347 }}>
        <ScatterChart accessibilityLayer title={label} desc={`${percent}% ${data?.goalLabel ?? ''}. One tick is one percent; pale short ticks remain. Use an arrow key to inspect the reading.`}
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 10, bottom: 10, left: 0, right: 0 }}>
          <RadialTallyAxes extent={134} yDomain={[-134 * 0.62, 134]} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active }) => active ? <div role="status" className="sr-only">{percent}% {data?.goalLabel}</div> : null} />
          <Scatter id={`${id}-progress`} data={[{ percent, x: 0, y: 0 }]} name="Goal progress" fill="var(--nx-ink)" shape={ProgressTicks} activeShape={ProgressTicks} {...motion} />
          <ScaleMarks />
        </ScatterChart>
      </ResponsiveContainer>
      <div data-nx-progress className="pointer-events-none absolute inset-x-0 top-[52%] text-center text-[length:calc(var(--nx-type-plotValue-size)*40/17)] font-[number:var(--nx-type-pageTitle-weight)] leading-none">{percent}%</div>
      <div className="pointer-events-none absolute inset-x-0 top-[74%] text-center text-[length:calc(var(--nx-type-legend-size)*8/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-muted)]">{data?.goalLabel}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE TICK = ONE PERCENT · PALE TICKS ARE WHAT REMAINS</div>
    </div>}
  </div>;
}
