'use client';

import { useId, useMemo } from 'react';
import { ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface HairlineDatum {
  label: string;
  value: number;
  /** Distinguish an observation, such as a weekend, without introducing hue. */
  hollow?: boolean;
}

export interface HairlineLineProps {
  data: readonly HairlineDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** An ordered observation is a dot; its baseline tick remains even when its value is unavailable. */
export function HairlineLine({
  data,
  height,
  width,
  animate = true,
  className = '',
  'aria-label': label = 'Values by observation',
}: HairlineLineProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    const top: number[] = [];
    const ranked = data.map((point, index) => ({ ...point, index }))
      .filter((point) => Number.isFinite(point.value)).sort((a, b) => b.value - a.value);
    for (const point of ranked) {
      if (top.every((index) => Math.abs(index - point.index) >= 5)) top.push(point.index);
      if (top.length === 2) break;
    }
    return data.map((point, index) => ({ ...point, index, value: Number.isFinite(point.value) ? point.value : null, peak: top.includes(index) }));
  }, [data]);
  const values = points.flatMap((point) => point.value === null ? [] : [point.value]);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const floor = values.length ? Math.min(...values) * 0.55 : 0;
  const ticks = [...new Set([0, Math.max(0, Math.floor(points.length / 2) - 1), points.length - 1])].filter((index) => index >= 0);

  return (
    <div ref={ref} className={`nx-hairline-line flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
      style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="hairline-line" data-nx-animated={motion.isAnimationActive}>
      {points.length === 0 || values.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div>
      ) : (
        <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: width ?? 540, height: height ?? 328 }}>
            <ComposedChart data={points} accessibilityLayer title={label} desc="Use the left and right arrow keys to inspect observations. Hollow marks indicate weekends."
              className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
              margin={{ top: 30, right: 22, bottom: 18, left: 26 }}>
              <XAxis dataKey="index" type="number" domain={points.length === 1 ? [-0.5, 0.5] : [0, points.length - 1]} ticks={ticks}
                tickFormatter={(index: number) => points[index]?.label ?? ''} tickLine={false} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'var(--nx-stroke-hairline)' }}
                tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontFamily: 'var(--nx-font-sans)', fontWeight: 'var(--nx-type-axis-weight)' }} />
              <YAxis type="number" hide domain={[min < 0 ? min - range * 0.16 : 0, max + range * 0.16]} />
              {points.map((point) => (
                <ReferenceLine key={point.index} segment={[{ x: point.index, y: 0 }, { x: point.index, y: floor }]}
                  stroke="var(--nx-plotFloor)" strokeWidth="var(--nx-stroke-hairline)" />
              ))}
              <Tooltip cursor={false} isAnimationActive={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as typeof points[number] | undefined;
                  return active && point ? <div className="bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:var(--nx-type-note-size)] text-[var(--nx-paper)]" role="status">{point.label}: {point.value === null ? 'Unavailable' : Math.round(point.value)}</div> : null;
                }} />
              <Line id={`${id}-series`} dataKey="value" name="Value" type="linear" connectNulls={false} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)"
                {...motion} activeDot={(props) => <circle cx={props.cx} cy={props.cy} r={5} fill="var(--nx-bg)" stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-emphasis)" />}
                dot={(props) => {
                  const point = props.payload as typeof points[number];
                  if (point.value === null || props.cx === undefined || props.cy === undefined) return <g key={point.index} />;
                  return <g key={point.index}>
                    <circle cx={props.cx} cy={props.cy} r={point.peak ? 4.2 : 2.1} fill={point.hollow ? 'var(--nx-bg)' : 'var(--nx-ink)'} stroke={point.hollow ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-mark)" />
                    {point.peak && <text x={props.cx} y={props.cy - 12} textAnchor="middle" fill="var(--nx-ink)" stroke="var(--nx-bg)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" fontSize="var(--nx-type-caption-size)" fontWeight="var(--nx-type-pageTitle-weight)">{Math.round(point.value)}</text>}
                  </g>;
                }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-axis-size)*0.875)] font-semibold text-[var(--nx-markQuiet)]">ONE DOT = ONE DAY · HOLLOW = WEEKEND</p>
        </div>
      )}
    </div>
  );
}
