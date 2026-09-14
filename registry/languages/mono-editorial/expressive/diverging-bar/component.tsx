'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DivergingBarDatum { segment: string; netAccounts: number | null }
export interface DivergingBarProps {
  data: readonly DivergingBarDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface SegmentPoint extends DivergingBarDatum { index: number }

function SignedBar({ x, y, width, height, payload }: BarShapeProps) {
  const point = payload as SegmentPoint;
  return <g data-nx-observation={point.index}>{width !== 0 && <Rectangle data-nx-bar={point.index}
    x={Math.min(x, x + width)} y={y} width={Math.abs(width)} height={height}
    radius={(point.netAccounts ?? 0) > 0 ? [0, 9, 9, 0] : [9, 0, 0, 9]}
    fill={(point.netAccounts ?? 0) > 0 ? 'var(--nx-ink)' : 'var(--nx-markQuiet)'} stroke="none" />}</g>;
}

function NetLabel({ value, observations }: LabelProps & { observations: readonly SegmentPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = typeof value === 'number' ? observations[value] : undefined;
  const x = xScale?.(point?.netAccounts ?? 0);
  const y = yScale?.(value, { position: 'middle' });
  const positive = (point?.netAccounts ?? 0) >= 0;
  return point && x !== undefined && y !== undefined ? <text data-nx-total={point.index} x={x + (positive ? 5 : -5)} y={y} dominantBaseline="central" textAnchor={positive ? 'start' : 'end'}
    fill="var(--nx-ink)" fontSize="calc(var(--nx-type-plotValue-size) * 11 / 17)" fontWeight="var(--nx-type-plotValue-weight)">{point.netAccounts === null ? '—' : `${point.netAccounts > 0 ? '+' : ''}${point.netAccounts}`}</text> : <g />;
}

/** Gains and losses extend from the same zero rule, with tone reinforcing sign. */
export function DivergingBar({ data, height, width, animate = true, className = '', 'aria-label': label = 'Net accounts by segment' }: DivergingBarProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.map((point, index): SegmentPoint => ({ segment: point.segment, index,
    netAccounts: point.netAccounts !== null && Number.isFinite(point.netAccounts) ? point.netAccounts : null,
  })), [data]);
  const minimum = Math.min(0, ...points.map((point) => point.netAccounts ?? 0));
  const maximum = Math.max(0, ...points.map((point) => point.netAccounts ?? 0));
  return <div ref={ref} className={`nx-diverging-bar flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="diverging-bar" data-nx-animated={motion.isAnimationActive}>
    {!points.some((point) => point.netAccounts !== null) ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <BarChart layout="vertical" data={points} accessibilityLayer title={label} desc="Growth extends right of zero; churn extends left. Use ArrowLeft to advance to the next segment and ArrowRight to return."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 8, right: 52, bottom: 8, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-mark)" />
          <XAxis type="number" hide tickCount={7} domain={minimum === maximum ? [-1, 1] : ['auto', 'auto']} />
          <YAxis dataKey="index" type="category" width={96} interval={0} axisLine={false} tickLine={false} tickMargin={8}
            tick={({ x, y, payload }) => <text x={x} y={y} textAnchor="end" dominantBaseline="central"
              fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 9.5 / 8)" fontWeight="var(--nx-type-axis-weight)">
              {typeof payload.value === 'number' ? points[payload.value]?.segment : ''}
            </text>} />
          <ReferenceLine x={0} stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-emphasis)" strokeDasharray="4.4 2.2" />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.segment} — {point.netAccounts === null ? 'Unavailable' : `${point.netAccounts > 0 ? '+' : ''}${point.netAccounts} accounts`}
            </div> : null;
          }} />
          <Bar id={`${id}-net`} dataKey="netAccounts" name="Net accounts" barSize={16} fill="var(--nx-ink)" stroke="none" shape={SignedBar} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<NetLabel observations={points} />} />
          </Bar>
          {points.filter((point) => point.netAccounts === null).map((point) => <NetLabel key={point.index} value={point.index} observations={points} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
