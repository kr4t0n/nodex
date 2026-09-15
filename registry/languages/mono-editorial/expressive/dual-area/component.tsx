'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, useActiveTooltipLabel, useIsTooltipActive } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DualAreaDatum {
  day: number;
  /** Daily ad spend in thousands of dollars. Null means unavailable; zero is measured. */
  spendK: number | null;
  /** Daily sign-up count. Null means unavailable; zero is measured. */
  signUps: number | null;
}

export interface DualAreaProps {
  data: readonly DualAreaDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

function observation(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Only the plot receiving input publishes its day; both cursors use that day. */
function InspectDay({ ownsInput, onInspect }: { ownsInput: boolean; onInspect: (index: number | null) => void }) {
  const index = useActiveTooltipLabel();
  const active = useIsTooltipActive();
  useEffect(() => {
    if (ownsInput) onInspect(active && typeof index === 'number' ? index : null);
  }, [ownsInput, active, index, onInspect]);
  return null;
}

/** Spend descends from the top; sign-ups rise below it on the same ordered days. */
export function DualArea({
  data,
  height,
  width,
  animate = true,
  className = '',
  'aria-label': label = 'Daily ad spend and sign-ups',
}: DualAreaProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const [activePlot, setActivePlot] = useState<'spend' | 'sign-ups'>('spend');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Keep unavailable observations in place so both plots retain the same calendar.
  const points = useMemo(() => data.map((point, index) => ({
    day: point.day,
    index,
    spendK: observation(point.spendK),
    signUps: observation(point.signUps),
  })), [data]);
  const available = points.some((point) => point.spendK !== null || point.signUps !== null);
  const inspectedDay = activeIndex !== null && points[activeIndex] ? activeIndex : null;
  const ticks = points.filter((_, index) => index % 7 === 0).map((point) => point.index);
  const chartStyle = '[&_.recharts-surface]:overflow-visible [&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]';
  const axisStyle = { fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 1.1875)', fontFamily: 'var(--nx-font-sans)' };
  const cursorStyle = { stroke: 'var(--nx-markQuiet)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '4 4' };

  function tooltip(active: boolean | undefined, index: unknown, plot: typeof activePlot) {
    const point = typeof index === 'number' ? points[index] : undefined;
    if (!active || activePlot !== plot || !point) return null;
    return <div className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]" role="status">
      Day {point.day} — spend {point.spendK === null ? 'Unavailable' : `$${point.spendK}K`} · {point.signUps === null ? 'Unavailable' : point.signUps} sign-ups
    </div>;
  }

  return (
    <div ref={ref} className={`nx-dual-area flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
      style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="dual-area" data-nx-animated={motion.isAnimationActive}>
      {!available ? (
        <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div>
      ) : (
        <div className={height === undefined ? 'relative aspect-[580/320] min-h-[260px] w-full' : 'relative min-h-0 flex-1'}>
          <div className="absolute inset-x-0 top-0 h-[calc(26%+8px)]" data-nx-plot="spend"
            onMouseMove={() => setActivePlot('spend')} onFocusCapture={() => setActivePlot('spend')} onKeyDownCapture={() => setActivePlot('spend')}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 86 }}>
              <ComposedChart data={points} accessibilityLayer title={`${label}: spend`}
                desc="Ad spend in thousands of dollars descends from the top. Use the left and right arrow keys to inspect both measures for each day."
                className={chartStyle} margin={{ top: 8, right: 14, bottom: 0, left: 0 }} barCategoryGap="22.5%" barGap={0}>
                <XAxis dataKey="index" type="category" scale="band" hide />
                <YAxis type="number" width={44} reversed domain={[0, (max: number) => Math.max(18, max)]} tickCount={7} interval={0}
                  tickLine={false} axisLine={false} tickSize={0} tickMargin={8} tickFormatter={(value: number) => `$${value}K`}
                  tick={{ ...axisStyle, fill: 'var(--nx-markQuiet)', fontSize: 'calc(var(--nx-type-axis-size) * 1.125)' }} />
                <InspectDay ownsInput={activePlot === 'spend'} onInspect={setActiveIndex} />
                {inspectedDay !== null && <ReferenceLine x={inspectedDay} className="nx-dual-area-cursor" pointerEvents="none" {...cursorStyle} />}
                <Tooltip filterNull={false} cursor={false} isAnimationActive={false}
                  content={({ active, label: index }) => tooltip(active, index, 'spend')} />
                {/* Reversed bars have negative height; round their descending ends. */}
                <Bar id={`${id}-spend`} dataKey="spendK" name="spend" fill="var(--nx-markQuiet)" stroke="none" radius={[4, 4, 0, 0]} activeBar={false} {...motion} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute inset-x-0 top-[42%] bottom-0" data-nx-plot="sign-ups"
            onMouseMove={() => setActivePlot('sign-ups')} onFocusCapture={() => setActivePlot('sign-ups')} onKeyDownCapture={() => setActivePlot('sign-ups')}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 173 }}>
              <AreaChart data={points} accessibilityLayer title={`${label}: sign-ups`}
                desc="Sign-ups rise from zero below the spend bars. Use the left and right arrow keys to inspect both measures for each day."
                className={chartStyle} margin={{ top: 0, right: 14, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`${id}-flow`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--nx-ink)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--nx-ink)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-mark)" />
                <XAxis dataKey="index" type="category" scale="band" height={26} ticks={ticks} interval={0}
                  tickFormatter={(index: number) => `D${points[index]?.day ?? ''}`} tickLine={false} axisLine={false} tickSize={0} tickMargin={8} tick={axisStyle} />
                <YAxis type="number" width={44} domain={[0, 'auto']} tickCount={7} allowDecimals={false} interval={0}
                  tickLine={false} axisLine={false} tickSize={0} tickMargin={8} tick={axisStyle} />
                <InspectDay ownsInput={activePlot === 'sign-ups'} onInspect={setActiveIndex} />
                {inspectedDay !== null && <ReferenceLine x={inspectedDay} className="nx-dual-area-cursor" pointerEvents="none" {...cursorStyle} />}
                <Tooltip filterNull={false} cursor={false} isAnimationActive={false}
                  content={({ active, label: index }) => tooltip(active, index, 'sign-ups')} />
                <Area id={`${id}-sign-ups`} dataKey="signUps" name="sign-ups" type="monotoneX" connectNulls={false}
                  baseValue={0} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" fill={`url(#${id}-flow)`} fillOpacity={1}
                  dot={false} activeDot={false} {...motion} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
