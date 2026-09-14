'use client';

import { useId, useMemo } from 'react';
import { Curve, DefaultZIndexes, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ZIndexLayer, useXAxisScale, useYAxisScale, type CurveProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface BubbleAlmanacDatum { yearIndex: number; areaIndex: number; tickets: number | null; beta: boolean }
export interface BubbleAlmanacEvent { year: string; note: string }
export interface BubbleAlmanacAnnotation { from: readonly [area: number, year: number]; to: readonly [area: number, year: number]; text: string }
export interface BubbleAlmanacProps {
  data: readonly BubbleAlmanacDatum[];
  years: readonly string[];
  areas: readonly string[];
  events: readonly BubbleAlmanacEvent[];
  annotations: readonly BubbleAlmanacAnnotation[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface ReadingPoint extends BubbleAlmanacDatum { id: string; x: number; y: number }
type Point = { x: number; y: number };
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
// A native Curve factory supplies the preserved quadratic midpoint rim to the library path context.
const softRim: Exclude<NonNullable<CurveProps['type']>, string> = context => {
  let points: Point[] = [];
  return { areaStart() {}, areaEnd() {}, lineStart() { points = []; }, point(x: number, y: number) { points.push({ x, y }); }, lineEnd() {
    const first = points[0]; if (!first) return; context.moveTo(first.x, first.y); let from = first;
    for (let index = 0; index < points.length; index++) { const control = points[index]!; const next = points[(index + 1) % points.length]!; const end = { x: (control.x + next.x) / 2, y: (control.y + next.y) / 2 };
      context.bezierCurveTo(from.x + (control.x - from.x) * 2 / 3, from.y + (control.y - from.y) * 2 / 3, end.x + (control.x - end.x) * 2 / 3, end.y + (control.y - end.y) * 2 / 3, end.x, end.y); from = end;
    } context.closePath();
  } };
};
function rim(cx: number, cy: number, radius: number, seed: number): Point[] {
  const count = Math.max(14, Math.round(radius * 1.6));
  return Array.from({ length: count }, (_, index) => { const angle = index / count * Math.PI * 2; const wobble = 1 + 0.055 * Math.sin(angle * 2 + seed * 7) + 0.04 * Math.sin(angle * 3 + seed * 13) + (random(seed + index, 3) - 0.5) * 0.03;
    return { x: cx + Math.cos(angle) * radius * wobble, y: cy + Math.sin(angle) * radius * wobble };
  });
}
function BubbleMark(props: unknown) {
  const { payload, cx, cy, size } = props as { payload?: ReadingPoint; cx?: number; cy?: number; size?: number };
  if (!payload || cx === undefined || cy === undefined || payload.tickets === null || payload.tickets === 0 || size === undefined) return <g />;
  const radius = Math.sqrt(Math.max(0, size) / Math.PI); const seed = payload.yearIndex * 12 + payload.areaIndex;
  if (payload.beta) return <g data-nx-observation={payload.id}><Curve data-nx-bubble={payload.id} data-nx-beta="true" data-nx-radius={radius} points={rim(cx, cy, radius, seed)} type={softRim} fill="none" stroke="var(--nx-muted)" strokeWidth="var(--nx-stroke-mark)" strokeDasharray="3 3" /></g>;
  const offsetX = (random(seed + 1, 17) - 0.5) * radius * 0.3; const offsetY = (random(seed + 3, 19) - 0.5) * radius * 0.3;
  return <g data-nx-observation={payload.id}>
    <Curve data-nx-bubble={payload.id} data-nx-beta="false" data-nx-radius={radius} points={rim(cx, cy, radius, seed)} type={softRim} fill="var(--nx-ink)" stroke="var(--nx-ink)" opacity={0.09 + random(payload.yearIndex + 2, payload.areaIndex + 4) * 0.1} strokeWidth={`calc(var(--nx-stroke-mark) * ${0.6 + random(payload.yearIndex + 3, payload.areaIndex + 11) * 0.8})`} strokeOpacity={0.3 + random(payload.yearIndex + 5, payload.areaIndex + 7) * 0.35} />
    <Curve data-nx-core={payload.id} points={rim(cx + offsetX, cy + offsetY, Math.max(1.4, radius * 0.17), seed + 29)} type={softRim} fill="var(--nx-ink)" stroke="none" />
  </g>;
}
function Ledger({ years, areaCount }: { years: readonly string[]; areaCount: number }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const left = xScale(-76); const right = xScale((areaCount - 1) * 57 + 30); const last = -(years.length - 1) * 34 - 42;
  return <g pointerEvents="none" aria-hidden="true">
    {Array.from({ length: Math.floor((24 - last) / 6.8) + 1 }, (_, index) => <line key={index} data-nx-ledger-line={index} x1={left} x2={right} y1={yScale(24 - index * 6.8)} y2={yScale(24 - index * 6.8)} stroke="var(--nx-plotLedger)" strokeWidth="calc(var(--nx-stroke-mark) / 2)" />)}
    {years.map((year, index) => <line key={index} data-nx-year-rule={year} x1={left} x2={right} y1={yScale(-index * 34)} y2={yScale(-index * 34)} stroke="var(--nx-plotRule)" strokeWidth="calc(var(--nx-stroke-mark) * 0.9)" />)}
  </g>;
}
function AlmanacLabels({ rows, years, areas, events, annotations, id }: { rows: readonly ReadingPoint[]; years: readonly string[]; areas: readonly string[]; events: readonly BubbleAlmanacEvent[]; annotations: readonly BubbleAlmanacAnnotation[]; id: string }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const point = (p: Point) => ({ x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 }); const spread = (areas.length - 1) * 57; const shelf = -(years.length - 1) * 34 - 30;
  // Keep marginalia in the existing headroom. HTML wrapping follows the actual
  // scoped font, and each note retains a leader to its caller-supplied target.
  const notes = annotations.filter(note => [...note.from, ...note.to].every(Number.isFinite));
  const left = xScale(-76) ?? 0; const right = xScale(spread + 30) ?? left;
  const noteWidth = (right - left) / Math.max(1, notes.length);
  const eventLeft = xScale(-42) ?? left;
  const eventStep = spread > 0
    ? (xScale(-42 + spread / Math.max(1, events.length * 0.9)) ?? right) - eventLeft
    : (right - eventLeft) / Math.max(1, events.length);
  return <g pointerEvents="none" aria-hidden="true">
    <defs>
      <filter id={`${id}-label-paper`} x="-15%" y="-10%" width="130%" height="120%" colorInterpolationFilters="sRGB">
        <feFlood floodColor="var(--nx-bg)" result="paper" />
        <feComposite in="SourceGraphic" in2="paper" operator="over" />
      </filter>
    </defs>
    {notes.map((note, index) => {
      const from = point({ x: note.from[0] * 57, y: -note.from[1] * 34 });
      const bend = point({ x: note.to[0] * 57, y: -note.to[1] * 34 });
      const column = left + index * noteWidth;
      const finish = { x: column + noteWidth / 2, y: 34 };
      const points = Array.from({ length: 17 }, (_, step) => { const t = step / 16; return { x: (1 - t) ** 3 * from.x + 3 * (1 - t) ** 2 * t * bend.x + (3 * (1 - t) * t * t + t ** 3) * finish.x, y: (1 - t) ** 3 * from.y + 3 * (1 - t) ** 2 * t * bend.y + (3 * (1 - t) * t * t + t ** 3) * finish.y }; });
      return <g key={index}>
        <Curve data-nx-note-pointer={index} points={points} type="linear" fill="none" stroke="var(--nx-markQuiet)" strokeWidth="var(--nx-stroke-hairline)" />
        <foreignObject x={column + 4} y={0} width={Math.max(0, noteWidth - 8)} height={30}>
          <div data-nx-marginal-note={index} className="flex h-full items-center justify-center text-center text-[length:calc(var(--nx-type-note-size)*7/11)] leading-tight text-[var(--nx-markMuted)] italic" style={{ opacity: 0.8 }}>{note.text}</div>
        </foreignObject>
      </g>;
    })}
    <g fillOpacity={0.8}>
      {years.map((year, index) => <text key={index} data-nx-year-label={index} x={(xScale(-76) ?? 0) - 4} y={yScale(-index * 34)} textAnchor="end" dominantBaseline="central" fill="var(--nx-muted)" fontSize="var(--nx-type-legend-size)" fontWeight="var(--nx-type-cardTitle-weight)">{year}</text>)}
      {areas.map((area, index) => { const p = point({ x: index * 57, y: 20 }); return <text key={index} data-nx-area-label={index} x={p.x} y={p.y} transform={`rotate(-32 ${p.x} ${p.y})`} textAnchor="middle" dominantBaseline="central" fill="var(--nx-muted)" filter={`url(#${id}-label-paper)`} fontSize="calc(var(--nx-type-axis-size) * 7.5 / 8)" fontWeight="var(--nx-type-cardTitle-weight)">{area}</text>; })}
    </g>
    {rows.filter(row => row.tickets !== null && row.tickets > 0).slice(0, 3).map(row => <text key={row.id} data-nx-largest={row.id} x={xScale(row.areaIndex * 57)} y={yScale(row.y + Math.sqrt(row.tickets! / 10) * 3.8 + 6)} textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" fillOpacity={0.8} filter={`url(#${id}-label-paper)`} fontSize="calc(var(--nx-type-plotValue-size) / 2)" fontWeight="var(--nx-type-pageTitle-weight)">{row.tickets}</text>)}
    <line x1={xScale(-76)} x2={xScale(spread + 30)} y1={yScale(shelf)} y2={yScale(shelf)} stroke="var(--nx-faint)" strokeWidth="calc(var(--nx-stroke-mark) * 0.8)" />
    <g opacity={0.8}>
      <text x={xScale(-76)} y={yScale(shelf + 10)} dominantBaseline="central" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-legend-size) * 7 / 9)" fontWeight="var(--nx-type-pageTitle-weight)">IMPORTANT EVENTS</text>
      {events.map((event, index) => {
        const x = eventLeft + index * eventStep;
        const next = index + 1 < events.length ? x + eventStep : right;
        const y = (yScale(shelf) ?? 0) + 6;
        return <foreignObject key={index} x={x} y={y} width={Math.max(0, next - x - 4)} height={40}>
          <div data-nx-event={index} className="flex flex-col pt-px text-[length:var(--nx-type-axis-size)] font-[number:var(--nx-type-pageTitle-weight)] leading-[1.125] text-[var(--nx-ink)]">
            <span>{event.year}</span>
            <span className="text-[length:calc(var(--nx-type-note-size)*7/11)] font-[number:var(--nx-type-subtitle-weight)] leading-tight text-[var(--nx-muted)]">{event.note}</span>
          </div>
        </foreignObject>;
      })}
    </g>
  </g>;
}
function BubbleSeries({ rows, id, motion }: { rows: readonly ReadingPoint[]; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }) {
  const xScale = useXAxisScale(); const scale = xScale ? Math.abs((xScale(1) ?? 0) - (xScale(0) ?? 0)) : 0; const maximum = Math.max(1, ...rows.map(row => row.tickets ?? 0));
  return <><ZAxis dataKey="tickets" domain={[0, maximum]} range={[0, Math.PI * 3.8 ** 2 * scale ** 2 * maximum / 10]} /><Scatter id={`${id}-readings`} data={rows} name="Support tickets" fill="var(--nx-ink)" shape={BubbleMark} activeShape={BubbleMark} {...motion} /></>;
}

/** A native Z scale owns bubble area; custom library curves retain the specimen's uneven rims. */
export function BubbleAlmanac({ data, years, areas, events, annotations, height, width, animate = true, className = '', 'aria-label': label = 'Support tickets by product area and year' }: BubbleAlmanacProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => data.filter(row => Number.isSafeInteger(row.yearIndex) && row.yearIndex >= 0 && row.yearIndex < years.length && Number.isSafeInteger(row.areaIndex) && row.areaIndex >= 0 && row.areaIndex < areas.length).map((row): ReadingPoint => ({ ...row, id: `${row.yearIndex}:${row.areaIndex}`, tickets: typeof row.tickets === 'number' && Number.isFinite(row.tickets) && row.tickets >= 0 ? row.tickets : null,
    x: row.areaIndex * 57 + (random(row.yearIndex * 7 + row.areaIndex + 2, row.areaIndex + 9) - 0.5) * 10, y: -row.yearIndex * 34 })).sort((a, b) => (b.tickets ?? -1) - (a.tickets ?? -1)), [data, years.length, areas.length]);
  const available = rows.some(row => row.tickets !== null) && new Set(rows.map(row => row.id)).size === rows.length;
  return <div ref={ref} className={`nx-bubble-almanac flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="bubble-almanac" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No unique ticket readings available.</div> : <div className={height === undefined ? 'aspect-[880/400] min-h-[320px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 245 }}>
        <ScatterChart accessibilityLayer title={label} desc="Bubble area shows ticket count; dashed outlines mark beta areas. Years run down the ledger and product areas across it. Zero counts have no ink; dark cores are a fixed visual treatment, not an independent count. Use the left and right arrow keys to inspect readings."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 40, bottom: 18, left: 30, right: 18 }}>
          <XAxis dataKey="x" type="number" hide domain={[-76, (areas.length - 1) * 57 + 30]} />
          <YAxis dataKey="y" type="number" hide domain={[-(years.length - 1) * 34 - 56, 30]} />
          <Ledger years={years} areaCount={areas.length} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as ReadingPoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{areas[row.areaIndex]} · {years[row.yearIndex]} — {row.tickets === null ? 'Unavailable' : `${row.tickets} tickets${row.beta ? ' (beta)' : ''}`}</div> : null;
          }} />
          <BubbleSeries rows={rows} id={id} motion={motion} />
          <ZIndexLayer zIndex={DefaultZIndexes.label}>
            <AlmanacLabels rows={rows} years={years} areas={areas} events={events} annotations={annotations} id={id} />
          </ZIndexLayer>
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
