'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface DumbbellQueueDatum { step: string; beforeMinutes: number | null; afterMinutes: number | null }
export interface DumbbellQueueProps {
  data: readonly DumbbellQueueDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface StepRow { step: string; beforeMinutes: number | null; afterMinutes: number | null; row: number }
interface Endpoint extends StepRow { kind: 'before' | 'after'; minutes: number; id: string }
const minutes = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;
const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

function EndpointMark(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Endpoint };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const before = payload.kind === 'before';
  return <g data-nx-observation={payload.id} opacity={0.8}>
    <circle data-nx-endpoint={payload.id} cx={cx} cy={cy} r={before ? 4.2 : 4.6} fill={before ? 'var(--nx-bg)' : 'var(--nx-ink)'} stroke={before ? 'var(--nx-ink)' : 'none'} strokeWidth="calc(var(--nx-stroke-mark) * 1.3)" />
    <text x={cx + (before ? 10 : -10)} y={cy - (before ? 10.85 : 10.6)} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fill={before ? 'var(--nx-markQuiet)' : 'var(--nx-ink)'}
      fontSize={`calc(var(--nx-type-plotValue-size) * ${before ? 8.5 : 10} / 17)`} fontWeight={before ? 'var(--nx-type-cardTitle-weight)' : 'var(--nx-type-pageTitle-weight)'}>{payload.minutes}</text>
  </g>;
}

function MinuteRails({ rows, ceiling }: { rows: readonly StepRow[]; ceiling: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g aria-hidden="true" pointerEvents="none">{rows.map((step) => {
    const y = yScale(step.row) ?? 0; const before = step.beforeMinutes; const after = step.afterMinutes;
    const saved = before !== null && after !== null ? Math.max(0, before - after) : 0;
    return <g key={step.row}>
      <text x={(xScale(0) ?? 0) - 12} y={y} textAnchor="end" dominantBaseline="central" fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{step.step}</text>
      <Curve points={[{ x: xScale(0) ?? 0, y }, { x: xScale(ceiling) ?? 0, y }]} type="linear" fill="none" stroke="var(--nx-plotGrid)" strokeWidth="var(--nx-stroke-hairline)" />
      {Array.from({ length: saved }, (_, index) => <circle key={index} data-nx-minute={step.row} cx={xScale((after ?? 0) + index + 0.5)} cy={y} r={1.5 + rnd(index + 2, step.row + 4) * 0.9} fill="var(--nx-muted)" opacity={0.85} />)}
    </g>;
  })}</g>;
}

/** Integer savings remain countable; decorative beads do not add keyboard stops. */
export function DumbbellQueue({ data, height, width, animate = true, className = '', 'aria-label': label = 'Before and after onboarding times' }: DumbbellQueueProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, points } = useMemo(() => {
    const rows: StepRow[] = data.map((step, row) => ({ step: step.step, beforeMinutes: minutes(step.beforeMinutes), afterMinutes: minutes(step.afterMinutes), row }));
    const points = (['before', 'after'] as const).flatMap((kind) => rows.flatMap((step): Endpoint[] => {
      const value = kind === 'before' ? step.beforeMinutes : step.afterMinutes;
      return value === null ? [] : [{ ...step, minutes: value, kind, id: `${step.row}:${kind}` }];
    }));
    return { rows, points };
  }, [data]);
  const ceiling = Math.max(42, ...points.map((point) => point.minutes));
  return <div ref={ref} className={`nx-dumbbell-queue flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="dumbbell-queue" data-nx-animated={motion.isAnimationActive}>
    {!points.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No timing observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Hollow dots show before and solid dots after. Each bead is one whole minute saved; increases have no saved-minute beads. Use the left and right arrow keys to inspect endpoints."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 30, right: 30, bottom: 0, left: 96 }}>
          <XAxis dataKey="minutes" type="number" domain={[0, ceiling]} height={50} ticks={[0, ceiling]} interval={0} tickLine={false} axisLine={false} tickSize={0} tickMargin={8}
            tickFormatter={(value: number) => value === 0 ? 'FASTER ←' : 'MINUTES'} tick={{ fill: 'var(--nx-faint)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis dataKey="row" type="number" reversed hide domain={[-0.5, rows.length - 0.5]} />
          <MinuteRails rows={rows} ceiling={ceiling} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Endpoint | undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{point.step} — {point.beforeMinutes === null ? 'unavailable' : `${point.beforeMinutes} min`} → {point.afterMinutes === null ? 'unavailable' : `${point.afterMinutes} min`}</div> : null;
          }} />
          <Scatter id={`${id}-endpoints`} data={points} name="Before and after" fill="var(--nx-ink)" shape={EndpointMark} activeShape={EndpointMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">HOLLOW = BEFORE · SOLID = AFTER · ONE BEAD = ONE MINUTE SAVED</div>
    </div>}
  </div>;
}
