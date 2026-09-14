'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { TallyMarks } from '../../../../_shared/tally-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface BallotTallyDatum { option: string; picked: number | null }
export interface BallotTallyProps {
  data: readonly BallotTallyDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface OptionPoint { choice: string; picked: number | null; row: number; boundary: number }

function BallotMarks(props: unknown) {
  const { cy, payload } = props as { cy?: number; payload?: OptionPoint };
  const xScale = useXAxisScale();
  if (cy === undefined || !payload || !xScale) return <g />;
  const count = payload.picked;
  return <g data-nx-observation={payload.row}>
    {count !== null && <>
      <TallyMarks from={count} to={100} x={xScale} y={cy - 6} length={[4.5, 2]} lengthSeed={payload.row + 5} opacity={[0.8, 0]}
        thickness="calc(var(--nx-stroke-hairline) * 0.55 / 0.7)" fill="var(--nx-markUnselected)" series="unpicked" />
      <TallyMarks to={count} x={xScale} y={cy - 9} length={[12, 5]} lengthSeed={payload.row + 2} opacity={[0.8, 0]}
        thickness="calc(var(--nx-stroke-mark) * 0.9)" fill="var(--nx-ink)" series="picked" />
      {Array.from({ length: 10 }, (_, index) => <circle key={index} data-nx-counting-dot={index * 10} cx={xScale(index * 10)} cy={cy + 5} r={0.8} fill="var(--nx-faint)" opacity={0.8} pointerEvents="none" />)}
    </>}
    <text data-nx-count={payload.row} x={xScale(payload.boundary)} y={cy - 14} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" opacity={0.8}
      fontSize="calc(var(--nx-type-plotValue-size) * 11 / 17)" fontWeight="var(--nx-type-pageTitle-weight)">{count ?? '—'}</text>
  </g>;
}

function BallotRows({ rows }: { rows: readonly OptionPoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const area = usePlotArea();
  if (!xScale || !yScale || !area) return null;
  // Keep headings above the counts, and dividers between complete annotated rows.
  return <g pointerEvents="none" aria-hidden="true">{rows.map((row) => {
    const y = (yScale(row.row + 0.5) ?? 0) - 12;
    return <g key={row.row}>
      <Curve data-nx-row-rule={row.row} points={[{ x: xScale(-1) ?? 0, y }, { x: xScale(100) ?? 0, y }]} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-hairline) * 6 / 7)" />
      <text data-nx-option-label={row.row} x={area.x} y={(yScale(row.row) ?? 0) - 39} dy="0.5em" dominantBaseline="central" fill="var(--nx-markMuted)"
        fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{row.choice}</text>
    </g>;
  })}</g>;
}

/** One option is one observation; its hundred respondent marks keep the denominator visible. */
export function BallotTally({ data, height, width, animate = true, className = '', 'aria-label': label = 'Survey responses, counted out of a hundred' }: BallotTallyProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.map((option, row): OptionPoint => {
    const picked = option.picked !== null && Number.isSafeInteger(option.picked) && option.picked >= 0 && option.picked <= 100 ? option.picked : null;
    return { choice: option.option, picked, row, boundary: (picked ?? 0) - 1 };
  }), [data]);
  const available = rows.some((row) => row.picked !== null);
  return <div ref={ref} className={`nx-ballot-tally flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="ballot-tally" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No response counts available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] w-full' : 'relative min-h-0 flex-1'}
      style={height === undefined ? { minHeight: Math.max(272, 82 + rows.length * 60) } : undefined}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each row represents the same hundred people. Tall dark ticks picked that option; short pale ticks did not. People could choose several options. Use the left and right arrow keys to inspect options."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 38, right: 22, bottom: 44, left: 22 }}>
          <XAxis dataKey="boundary" type="number" hide domain={[-1, 100]} />
          <YAxis dataKey="row" type="number" hide reversed domain={[-0.5, rows.length - 0.5]} />
          <BallotRows rows={rows} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const option = payload?.[0]?.payload as OptionPoint | undefined;
            return active && option ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{option.picked === null ? 'Unavailable' : `${option.picked} of 100 picked this — they could pick several`}</div> : null;
          }} />
          <Scatter id={`${id}-options`} data={rows} name="Survey options" fill="var(--nx-ink)" shape={BallotMarks} activeShape={BallotMarks} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">EACH ROW IS THE SAME HUNDRED PEOPLE · THEY COULD PICK SEVERAL</div>
    </div>}
  </div>;
}
