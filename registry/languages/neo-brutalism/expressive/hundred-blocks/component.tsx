'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { neoCategoryTone, type NeoCategoryTone } from '../../../../_shared/neo-categorical';
import { NeoChartFrame, NeoChartTooltip } from '../../../../_shared/neo-chart-frame';

export interface HundredBlocksDatum { id: string; label: string; percent: number | null; tone?: NeoCategoryTone }
export interface HundredBlocksProps {
  data: readonly HundredBlocksDatum[]; unitLabel?: string; contextLabel?: string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Share extends HundredBlocksDatum { percent: number | null; start: number; x: number; y: number; fill: string }
const tones: Record<NeoCategoryTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };

function ShareBlocks(props: unknown) {
  const { payload } = props as { payload?: Share };
  const plot = usePlotArea(); const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || !plot || !xScale || !yScale || payload.percent === null) return <g />;
  const size = Math.max(1, Math.min(plot.width, plot.height) / 10 - 6);
  return <g data-nx-share={payload.id}>{Array.from({ length: payload.percent }, (_, index) => {
    const cell = payload.start + index; const x = xScale(cell % 10); const y = yScale(Math.floor(cell / 10));
    return x === undefined || y === undefined ? null : <rect key={cell} data-nx-unit={payload.id} data-nx-cell={cell}
      x={x - size / 2} y={y - size / 2} width={size} height={size} fill={payload.fill} stroke="var(--nx-ink)"
      style={{ strokeWidth: 'var(--nx-stroke-hairline)', filter: 'drop-shadow(var(--nx-shadow-badge) var(--nx-ink))' }} />;
  })}</g>;
}

/** Exactly 100 countable blocks, with one keyboard stop per category rather than per block. */
export function HundredBlocks({ data, unitLabel = 'Share', contextLabel, width, height, animate = true, className, 'aria-label': label = 'Shares in one hundred blocks' }: HundredBlocksProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const shares = useMemo(() => {
    let start = 0;
    return data.map((datum): Share => {
      const percent = datum.percent !== null && Number.isSafeInteger(datum.percent) && datum.percent >= 0 && datum.percent <= 100 ? datum.percent : null;
      const cell = Math.min(99, start + Math.floor((percent ?? 0) / 2));
      const share = { ...datum, percent, start, x: cell % 10, y: Math.floor(cell / 10), fill: tones[neoCategoryTone(datum.id, datum.tone)] };
      start += percent ?? 0;
      return share;
    });
  }, [data]);
  const validIds = data.every(datum => datum.id.trim()) && new Set(data.map(datum => datum.id)).size === data.length;
  const status = !shares.length ? 'No shares available.' : !validIds ? 'Each category needs a unique, nonempty ID.'
    : shares.some(share => share.percent === null) || shares.reduce((sum, share) => sum + (share.percent ?? 0), 0) !== 100 ? 'Provide complete whole-percent shares totaling 100.' : null;
  return <NeoChartFrame ref={ref} name="hundred-blocks" heading={unitLabel} contextLabel={contextLabel} width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className="mt-[var(--nx-space-cardBodyGap)] grid min-h-0 flex-1 items-center gap-[var(--nx-space-gridGap)] overflow-auto @min-[500px]:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="min-w-0">
        <div className="mx-auto aspect-square w-full max-w-[350px]">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 340, height: 340 }}>
            <ScatterChart accessibilityLayer title={label} desc="One outlined block is one percent. Fill runs left to right, then top to bottom in caller category order. All one hundred blocks are assigned. Use left and right arrow keys to inspect categories."
              margin={{ top: 4, right: 6, bottom: 6, left: 4 }} className="[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <XAxis dataKey="x" type="number" hide domain={[-0.5, 9.5]} />
              <YAxis dataKey="y" type="number" hide reversed domain={[-0.5, 9.5]} />
              <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
                const share = payload?.[0]?.payload as Share | undefined;
                return active && share ? <NeoChartTooltip title={share.label}><div>{share.percent}% · {share.percent} of 100 blocks</div></NeoChartTooltip> : null;
              }} />
              <Scatter id={`${id}-shares`} data={shares} fill="var(--nx-ink)" shape={ShareBlocks} activeShape={ShareBlocks} {...motion} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 text-center text-[length:var(--nx-type-caption-size)] font-[number:var(--nx-type-caption-weight)] uppercase">One block = 1%</div>
      </div>
      <ul aria-label="Category percentages" className="m-0 min-w-0 list-none p-0">
        {shares.map(share => <li key={share.id} data-nx-share-key={share.id} className="border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] py-4 first:pt-0 last:border-0 last:pb-0">
          <div className="flex items-center gap-2 text-[length:var(--nx-type-body-size)] font-[number:var(--nx-font-weight-bold)]"><span className="h-4 w-4 shrink-0 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)]" style={{ background: share.fill }} />{share.label}</div>
          <div className="mt-1 text-[length:var(--nx-type-stat-size)] leading-[var(--nx-type-stat-lineHeight)] font-[number:var(--nx-font-weight-bold)] tracking-[var(--nx-type-stat-tracking)]">{share.percent}%</div>
        </li>)}
      </ul>
    </div>
  </NeoChartFrame>;
}
