'use client';

import { Fragment, useId, useMemo } from 'react';
import { Area, Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { ZeroAxisRail } from '../../../../_shared/zero-axis-rail';

export interface RidgelineDensity { hours: number; density: number | null }
export interface RidgelineDatum { pipeline: string; density: readonly RidgelineDensity[] }
export interface RidgelineProps {
  data: readonly RidgelineDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface DensityPoint { hours: number; density: number | null; lift: number | null; range: [number, number] | null; row: number; sample: number; pipeline: string }
interface PlotPoint { hours: number; profiles: Map<number, DensityPoint> }

function DensityHairline({ row, x, y, width, height, payload }: { row: number; x?: number; y?: number; width?: number; height?: number; payload?: PlotPoint }) {
  const point = payload?.profiles.get(row);
  if (x === undefined || y === undefined || width === undefined || height === undefined || !point?.range) return <g />;
  return <line data-nx-ridge={row} data-nx-sample={point.sample} x1={x + width / 2} x2={x + width / 2} y1={y} y2={y + height} fill="none"
    stroke="var(--nx-muted)" strokeWidth="calc(var(--nx-stroke-hairline) * 5 / 7)" opacity={0.5} />;
}

/** Caller profiles become native area, bar and line series with preserved overlap order. */
export function Ridgeline({ data, height, width, animate = true, className = '', 'aria-label': label = 'Pipeline completion-time densities' }: RidgelineProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { profiles, plot, available, ceiling } = useMemo(() => {
    let available = 0;
    let ceiling = 24;
    const profiles = data.map((profile, row) => {
      const base = data.length - 1 - row;
      const clean = profile.density.flatMap((point, sample) => Number.isFinite(point.hours) && point.hours >= 0
        ? [{ hours: point.hours, density: point.density !== null && Number.isFinite(point.density) && point.density >= 0 ? point.density : null, sample }] : []).sort((a, b) => a.hours - b.hours || a.sample - b.sample);
      if (new Set(clean.map((point) => point.hours)).size !== clean.length) return [];
      const maximum = Math.max(0, ...clean.flatMap((point) => point.density === null ? [] : [point.density]));
      return clean.map((point): DensityPoint => {
        ceiling = Math.max(ceiling, point.hours);
        if (point.density !== null) available++;
        const lift = point.density === null ? null : base + (maximum > 0 ? point.density / maximum : 0) * 1.24;
        return { ...point, lift, range: lift === null || point.sample % 2 ? null : [base, lift], row, pipeline: profile.pipeline };
      });
    });
    const hours = new Map<number, PlotPoint>();
    for (const profile of profiles) for (const point of profile) {
      if (!hours.has(point.hours)) hours.set(point.hours, { hours: point.hours, profiles: new Map() });
      hours.get(point.hours)?.profiles.set(point.row, point);
    }
    return { profiles, plot: [...hours.values()].sort((a, b) => a.hours - b.hours), available, ceiling };
  }, [data]);
  const tickStep = Math.max(5, Math.ceil(ceiling / 24) * 5);
  const ticks = [...Array.from({ length: Math.floor(ceiling / tickStep) + 1 }, (_, index) => index * tickStep), ...(ceiling % tickStep ? [ceiling] : [])];
  return <div ref={ref} className={`nx-ridgeline flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="ridgeline" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ComposedChart data={plot} accessibilityLayer title={label} desc={`Each row is a pipeline, in order: ${data.map((profile) => profile.pipeline).join(', ')}. Crests show relative completion-time density, normalized within each row. Use the left and right arrow keys to inspect profile values.`}
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          barGap={-1} margin={{ top: 24, right: 26, bottom: 0, left: 88 }}>
          <XAxis dataKey="hours" type="number" domain={[0, ceiling]} height={46} ticks={ticks} interval={0} tickMargin={8} tickSize={0}
            tickFormatter={(hours: number) => `${hours}h`} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7 / 8)', fontWeight: 'var(--nx-type-axis-weight)' }} />
          <YAxis type="number" hide domain={[-0.1, data.length - 1 + 1.24 + 0.15]} />
          <ZeroAxisRail ticks={ticks} domain={[0, ceiling]} stroke="var(--nx-markQuiet)" tickStroke="var(--nx-markQuiet)" />
          <Tooltip cursor={false} filterNull={false} isAnimationActive={false} content={({ active, label: selected }) => {
            const observation = active && typeof selected === 'number' ? plot.find((point) => point.hours === selected) : undefined;
            // Own-series tooltip payloads can fall back to another hour. The public
            // axis label identifies the actual column in the caller's union of hours.
            return observation ? <span role="status" className="sr-only">{observation.hours.toFixed(2)} hours. {data.map((profile, row) => {
              const value = observation.profiles.get(row)?.density;
              return `${profile.pipeline}: ${value === null || value === undefined ? 'unavailable' : value.toPrecision(3)}`;
            }).join('. ')}</span> : null;
          }} />
          {profiles.map((points, row) => <Fragment key={row}>
            <Area id={`${id}-fill-${row}`} className="nx-ridge-fill" data={points} dataKey="lift" type="linear" baseValue={-0.1} connectNulls={false} dot={false} activeDot={false}
              fill="var(--nx-bg)" fillOpacity={0.96} stroke="none" tooltipType="none" zIndex={row * 3 + 1} {...motion} />
            <Bar id={`${id}-hatches-${row}`} dataKey={(point: PlotPoint) => point.profiles?.get(row)?.range ?? null} barSize={1} shape={<DensityHairline row={row} />} activeBar={false} tooltipType="none" zIndex={row * 3 + 2} {...motion} />
            <Line id={`${id}-crest-${row}`} className="nx-ridge-crest" data={points} dataKey="lift" name={data[row]?.pipeline} type="linear" connectNulls={false} dot={false} activeDot={false}
              stroke="var(--nx-ink)" strokeWidth="calc(var(--nx-stroke-hairline) * 9 / 7)" zIndex={row * 3 + 3} {...motion} />
          </Fragment>)}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">EACH CREST IS MADE OF HAIRLINES · ONE ROW = ONE PIPELINE</div>
    </div>}
  </div>;
}
