'use client';

import { useId, useMemo } from 'react';
import { Curve, Rectangle, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ThreadTriptychDatum { sourceIndex: number; processorIndex: number; destinationIndex: number; volumeK: number | null }
export interface ThreadTriptychProps {
  data: readonly ThreadTriptychDatum[];
  sources: readonly string[];
  processors: readonly string[];
  destinations: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface RoutePoint { kind: 'route'; index: number; x: number; y: number; reading: ThreadTriptychDatum | null; label: string }
interface NodePoint { kind: 'source' | 'processor' | 'destination'; index: number; x: number; y: number; label: string }
type PipelinePoint = RoutePoint | NodePoint;
const sourceY = (index: number) => -index * 22.6;
const processorY = (index: number) => -index * 11.3 - 6;
const destinationY = (index: number) => -index * 45 - 24;
function PipelineMark(props: unknown) {
  const { payload, cx, cy, isAnimating, animationElapsedTime } = props as { payload?: PipelinePoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  if (payload.kind === 'route') {
    const reading = payload.reading;
    if (!reading || reading.volumeK === null || reading.volumeK === 0) return <g data-nx-observation={`route-${payload.index}`} />;
    return <g data-nx-observation={`route-${payload.index}`}><Curve data-nx-route={payload.index} points={[{ x: xScale(8) ?? 0, y: yScale(sourceY(reading.sourceIndex)) ?? 0 }, { x: xScale(380) ?? 0, y: yScale(processorY(reading.processorIndex)) ?? 0 }, { x: xScale(742) ?? 0, y: yScale(destinationY(reading.destinationIndex)) ?? 0 }]} type="bumpX" fill="none" stroke="var(--nx-ink)" strokeWidth={`calc(var(--nx-stroke-mark) * ${Math.max(0.6, reading.volumeK * 0.14)})`} opacity={(0.06 + Math.min(0.2, reading.volumeK * 0.012)) * progress} strokeLinecap="round" /></g>;
  }
  const processor = payload.kind === 'processor'; const source = payload.kind === 'source'; const width = processor ? 5 : 6; const height = processor ? 2.2 : 3.2;
  return <g data-nx-observation={`${payload.kind}-${payload.index}`} opacity={(processor ? 0.7 : 0.85) * progress}>
    <Rectangle data-nx-pipeline-node={`${payload.kind}-${payload.index}`} x={cx - width / 2} y={cy - height / 2} width={width} height={height} fill="var(--nx-ink)" stroke="none" />
    {!processor && <text data-nx-pipeline-label={`${payload.kind}-${payload.index}`} x={cx + (source ? -9 : 9)} y={cy} textAnchor={source ? 'end' : 'start'} dominantBaseline="central" fill={source ? 'var(--nx-muted)' : 'var(--nx-ink)'} fontSize={source ? 'calc(var(--nx-type-axis-size) * 7 / 8)' : 'var(--nx-type-axis-size)'} fontWeight={source ? 'var(--nx-type-axis-weight)' : 'var(--nx-type-cardTitle-weight)'}>{payload.label}</text>}
  </g>;
}

/** Each native route observation owns one continuous pair of library-generated cubic curves. */
export function ThreadTriptych({ data, sources, processors, destinations, height, width, animate = true, className = '', 'aria-label': label = 'Source to processor to destination routes' }: ThreadTriptychProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const layout = useMemo(() => {
    const validIndex = (index: number, labels: readonly string[]) => Number.isSafeInteger(index) && index >= 0 && index < labels.length;
    const routes: RoutePoint[] = data.map((row, index) => {
      const valid = validIndex(row.sourceIndex, sources) && validIndex(row.processorIndex, processors) && validIndex(row.destinationIndex, destinations) && typeof row.volumeK === 'number' && Number.isFinite(row.volumeK) && row.volumeK >= 0;
      return { kind: 'route', index, x: 0, y: validIndex(row.sourceIndex, sources) ? sourceY(row.sourceIndex) : 0, reading: valid ? row : null, label: `${sources[row.sourceIndex] ?? 'Unavailable source'} → ${processors[row.processorIndex] ?? 'Unavailable processor'} → ${destinations[row.destinationIndex] ?? 'Unavailable destination'}` };
    });
    const nodes: NodePoint[] = [...sources.map((label, index): NodePoint => ({ kind: 'source', index, label, x: 0, y: sourceY(index) })), ...processors.map((label, index): NodePoint => ({ kind: 'processor', index, label, x: 380, y: processorY(index) })), ...destinations.map((label, index): NodePoint => ({ kind: 'destination', index, label, x: 750, y: destinationY(index) }))];
    return { available: routes.some(route => route.reading !== null), rows: [...routes, ...nodes] };
  }, [data, sources, processors, destinations]);
  const bottom = Math.min(sourceY(sources.length - 1), processorY(processors.length - 1), destinationY(destinations.length - 1));
  return <div ref={ref} className={`nx-thread-triptych flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="thread-triptych" data-nx-animated={motion.isAnimationActive}>
    {!layout.available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete data routes available.</div> : <div className={height === undefined ? 'relative aspect-[1140/640] min-h-[320px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 303 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each thread follows one route through three columns; its width encodes thousands of events per day. Processor names appear on inspection. Use the left and right arrow keys to inspect routes and their nodes."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 34, bottom: 14, left: 74, right: 96 }}>
          <XAxis dataKey="x" type="number" hide domain={[-10, 760]} />
          <YAxis dataKey="y" type="number" hide domain={[bottom - 16, 40]} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as PipelinePoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.label}{row.kind === 'route' ? ` · ${row.reading ? `${row.reading.volumeK}k ev/day` : 'Unavailable'}` : ''}</div> : null;
          }} />
          <Scatter id={`${id}-routes-and-nodes`} data={layout.rows} name="Routes and nodes" fill="var(--nx-ink)" shape={PipelineMark} activeShape={PipelineMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">{['① SOURCE', '② PROCESSOR', '③ DESTINATION'].map((heading, index) => <div key={heading} className="absolute top-1 whitespace-nowrap text-[length:var(--nx-type-legend-size)] font-[number:var(--nx-type-pageTitle-weight)] leading-none" style={{ left: `${8 + index * 42}%` }}>{heading}</div>)}</div>
    </div>}
  </div>;
}
