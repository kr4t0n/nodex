'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface EndpointDatum {
  route: string;
  p99Ms: number;
}

export interface EndpointLatencyProps {
  data: readonly EndpointDatum[];
  objectiveMs: number;
  label?: string;
  source?: string;
  window?: string;
  updated?: string;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Ranked tail latency. Color reports objective breaches; it never stands for category. */
export function EndpointLatency({ data, objectiveMs, label = 'ENDPOINT LATENCY', source, window: windowLabel, updated, height, width, animate = true, className = '', 'aria-label': accessibleLabel = 'Endpoint tail latency' }: EndpointLatencyProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const ranked = useMemo(() => data.map((point, index) => ({ ...point, index }))
    .filter((point) => Number.isFinite(point.p99Ms) && point.p99Ms >= 0).sort((a, b) => b.p99Ms - a.p99Ms), [data]);
  const objective = Number.isFinite(objectiveMs) && objectiveMs >= 0 ? objectiveMs : null;
  const breaches = objective === null ? 0 : ranked.filter((point) => point.p99Ms > objective).length;

  return (
    <div ref={ref} className={`nx-endpoint-latency flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-surface)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
      style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="endpoint-latency" data-nx-animated={motion.isAnimationActive}>
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <span className="text-[length:var(--nx-type-caption-size)] font-medium text-[var(--nx-muted)] [letter-spacing:var(--nx-type-caption-tracking)]">{label}</span>
        <span className={`text-[length:var(--nx-type-pageTitle-size)] font-bold tabular-nums ${breaches > 0 ? 'text-[var(--nx-crit)]' : 'text-[var(--nx-ink)]'}`}>
          {objective === null ? '—' : breaches}
          <span className="text-[length:var(--nx-type-caption-size)] font-medium text-[var(--nx-faint)] [letter-spacing:var(--nx-type-caption-tracking)]"> OF {ranked.length} OVER SLO</span>
        </span>
      </div>
      {ranked.length === 0 ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No endpoint observations available.</div> : (
        <div className={height === undefined ? 'mt-1.5 aspect-[420/260] min-h-[210px] w-full' : 'mt-1.5 min-h-0 flex-1'}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: width ?? 540, height: height ?? 334 }}>
            <BarChart data={ranked} layout="vertical" accessibilityLayer title={accessibleLabel} desc="Routes are ranked from slowest to fastest. Use the left arrow key for the next route and the right arrow key for the previous route."
              className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
              margin={{ top: 22, right: 44, bottom: 0, left: 0 }} barCategoryGap="19%">
              <CartesianGrid horizontal={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
              <XAxis type="number" domain={[0, 'auto']} height={24} tickLine={false} axisLine={false} tickCount={5} tickFormatter={(value: number) => `${value}MS`}
                tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)', fontFamily: 'var(--nx-font-sans)' }} />
              <YAxis type="category" dataKey="route" width={122} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'var(--nx-stroke-hairline)' }} tickLine={false}
                tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontFamily: 'var(--nx-font-sans)' }} />
              <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
                const point = payload?.[0]?.payload as typeof ranked[number] | undefined;
                return active && point ? <div role="status" className="rounded-[var(--nx-radius-card)] border border-[var(--nx-grid)] bg-[var(--nx-surface)] px-3 py-2 text-[length:var(--nx-type-note-size)] text-[var(--nx-ink)]">
                  {point.route} · {point.p99Ms}ms p99
                </div> : null;
              }} />
              <Bar id={`${id}-latencies`} dataKey="p99Ms" name="p99 latency" fill="var(--nx-withinObjective)" radius={[0, 2, 2, 0]} {...motion}>
                {ranked.map((point) => <Cell key={point.index} fill={objective === null ? 'var(--nx-muted)' : point.p99Ms > objective ? 'var(--nx-crit)' : 'var(--nx-withinObjective)'} />)}
                <LabelList dataKey="p99Ms" position="right" offset={6} fill="var(--nx-faint)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-cardTitle-weight)" />
              </Bar>
              {objective !== null && <ReferenceLine x={objective} ifOverflow="extendDomain" stroke="var(--nx-warn)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 4"
                label={{ value: `SLO ${objective}MS`, position: 'top', fill: 'var(--nx-warn)', fontSize: 'var(--nx-type-axis-size)', offset: 5 }} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {(source || windowLabel || updated) && <div className="mt-1.5 flex shrink-0 justify-between gap-2.5 border-t-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] pt-[7px] text-[length:var(--nx-type-caption-size)] font-medium text-[var(--nx-faint)] tabular-nums [letter-spacing:var(--nx-type-caption-tracking)]">
        <span>{source}</span><span>{windowLabel}</span><span>{updated}</span>
      </div>}
    </div>
  );
}
