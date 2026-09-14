'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Bar, BarChart, CartesianGrid, Curve, Pie, PieChart, Rectangle, ResponsiveContainer, Scatter, ScatterChart, Sector, Tooltip, XAxis, YAxis, ZAxis, usePlotArea } from 'recharts';
import type { AnimationItem, BarShapeProps, PieSectorShapeProps, ScatterPointItem } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ScatterMorphDatum { id: string; product: string; priceUsd: number | null; csat: number | null; revenueK: number | null }
export interface ScatterMorphProps {
  data: readonly ScatterMorphDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
type View = 'scatter' | 'bar' | 'donut';
interface Product extends ScatterMorphDatum { index: number; tone: string; areaValue: number }
interface Point { x: number; y: number }
interface Transition { view: View; from: ReadonlyMap<string, readonly Point[]>; data?: readonly ScatterMorphDatum[] }
const noOutlines: ReadonlyMap<string, readonly Point[]> = new Map();
const views: readonly View[] = ['scatter', 'bar', 'donut'];
const captions = { scatter: 'PRICE VS RATING', bar: 'REVENUE, RANKED', donut: 'REVENUE SHARE' };
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
const available = (value: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const finalItems = <T,>(items: readonly AnimationItem<T>[] | null): readonly T[] => (items ?? []).flatMap(item => item.status === 'removed' ? [] : [item.next]);
const focusClass = '[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]';
const axisText = { fill: 'var(--nx-muted)', fontFamily: 'var(--nx-font-sans)', fontSize: 'calc(var(--nx-type-axis-size) * 8.5 / 8)' };

/** Sample actual library-generated geometry only while a reader requests a change of encoding. */
function outline(element: SVGGeometryElement): Point[] {
  const length = element.getTotalLength(); if (!Number.isFinite(length) || length <= 0) return [];
  return Array.from({ length: 128 }, (_, index) => { const p = element.getPointAtLength(length * index / 128); return { x: p.x, y: p.y }; });
}
function aligned(from: readonly Point[], to: readonly Point[]): Point[] {
  if (from.length !== to.length || !to.length) return [...to];
  let best = Infinity; let offset = 0; let direction = 1;
  // Closed outlines have no semantic first vertex; choose the orientation and seam with least travel.
  for (const step of [1, -1]) for (let shift = 0; shift < to.length; shift++) {
    let distance = 0;
    for (let i = 0; i < from.length; i++) { const target = to[(shift + step * i + to.length) % to.length]!; const start = from[i]!; distance += (target.x - start.x) ** 2 + (target.y - start.y) ** 2; }
    if (distance < best) { best = distance; offset = shift; direction = step; }
  }
  return to.map((_, index) => to[(offset + direction * index + to.length) % to.length]!);
}
function MorphMark({ row, native, geometryKey, progress, from, enabled, knockout = false, opacity = 1 }: { row: Product; native: ReactElement; geometryKey: string; progress: number; from: readonly Point[] | undefined; enabled: boolean; knockout?: boolean; opacity?: number }) {
  const ref = useRef<SVGGElement>(null); const [target, setTarget] = useState<{ key: string; from: readonly Point[]; points: readonly Point[] } | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !from?.length) return;
    const element = ref.current?.querySelector<SVGGeometryElement>('path,circle,rect'); if (!element) return;
    const points = outline(element); if (points.length) setTarget({ key: geometryKey, from, points: aligned(from, points) });
  }, [enabled, from, geometryKey]);
  const moving = enabled && !!from?.length && progress < 1; const to = target?.key === geometryKey && target.from === from ? target.points : from;
  const points = moving && from && to ? from.map((point, index) => ({ x: point.x + ((to[index]?.x ?? point.x) - point.x) * progress, y: point.y + ((to[index]?.y ?? point.y) - point.y) * progress })) : [];
  return <g data-nx-product-id={row.id} data-nx-morph-progress={progress} fill={row.tone} opacity={opacity}>
    <g ref={ref} data-nx-native-mark={row.id} data-nx-visible={moving ? 'false' : 'true'} opacity={moving ? 0 : 1} pointerEvents={moving ? 'none' : undefined}>{native}</g>
    {moving && points.length > 0 && <Curve data-nx-moving-mark={row.id} type="linearClosed" points={points} fill={row.tone} fillRule="evenodd" stroke={knockout ? 'var(--nx-paper)' : 'none'} strokeWidth={knockout ? 2 * progress : 0} />}
  </g>;
}
function ScatterProduct({ value, transition, enabled }: { value: unknown; transition: Transition; enabled: boolean }) {
  const { payload: row, cx, cy, size, animationElapsedTime = 1, isAnimating } = value as ScatterPointItem & { payload: Product; animationElapsedTime?: number; isAnimating?: boolean };
  if (cx === undefined || cy === undefined || row.priceUsd === null || row.csat === null || row.revenueK === null) return <g />;
  const radius = Math.sqrt(Math.max(0, size) / Math.PI); const progress = isAnimating ? animationElapsedTime : 1;
  return <g>{radius > 0 && <MorphMark row={row} native={<circle cx={cx} cy={cy} r={radius} fill={row.tone} />} geometryKey={`scatter-${cx}-${cy}-${radius}`} progress={progress} from={transition.from.get(row.id)} enabled={enabled} opacity={0.8} />}
    <text data-nx-product-label={row.id} x={cx} y={cy - radius - 5} textAnchor="middle" dominantBaseline="auto" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)" opacity={progress * 0.8} pointerEvents="none">{row.product}</text>
  </g>;
}
function BarProduct({ value, transition, enabled }: { value: BarShapeProps; transition: Transition; enabled: boolean }) {
  const row = value.payload as Product; const { x, y, width, height, animationElapsedTime = 1, isAnimating } = value;
  return row.revenueK !== null && row.revenueK > 0 ? <MorphMark row={row} native={<Rectangle x={x} y={y} width={width} height={height} radius={[6, 6, 0, 0]} fill={row.tone} stroke="none" />} geometryKey={`bar-${x}-${y}-${width}-${height}`} progress={isAnimating ? animationElapsedTime : 1} from={transition.from.get(row.id)} enabled={enabled} /> : <g />;
}
function DonutProduct({ value, transition, enabled }: { value: PieSectorShapeProps; transition: Transition; enabled: boolean }) {
  const row = value.payload as Product; const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, animationElapsedTime = 1, isAnimating } = value;
  if (row.revenueK === null || row.revenueK <= 0) return <g />;
  const progress = isAnimating ? animationElapsedTime : 1; const angle = -(startAngle + endAngle) / 2 * Math.PI / 180; const sign = Math.cos(angle) >= 0 ? 1 : -1;
  const a = { x: cx + Math.cos(angle) * outerRadius, y: cy + Math.sin(angle) * outerRadius }; const b = { x: cx + Math.cos(angle) * (outerRadius + 15), y: cy + Math.sin(angle) * (outerRadius + 15) }; const c = { x: b.x + sign * 30, y: b.y };
  return <g><MorphMark row={row} native={<Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} cornerRadius={6} fill={row.tone} stroke="var(--nx-paper)" strokeWidth={2} />} geometryKey={`donut-${cx}-${cy}-${innerRadius}-${outerRadius}-${startAngle}-${endAngle}`} progress={progress} from={transition.from.get(row.id)} enabled={enabled} knockout />
    <g opacity={progress} pointerEvents="none"><Curve points={[a,b,c]} type="linear" fill="none" stroke="var(--nx-faint)" strokeWidth="var(--nx-stroke-mark)" /><text data-nx-product-label={row.id} x={c.x + sign * 5} y={c.y} dominantBaseline="central" textAnchor={sign > 0 ? 'start' : 'end'} fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-axis-size) * 9 / 8)">{row.product}</text></g>
  </g>;
}
function AxisNames() {
  const plot = usePlotArea(); if (!plot) return null;
  const x = plot.x - 36.25; const y = plot.y + plot.height / 2;
  return <g pointerEvents="none" fill="var(--nx-faint)" fontSize="calc(var(--nx-type-axis-size) * 8.5 / 8)"><text x={plot.x + plot.width / 2} y={plot.y + plot.height + 28.25} dominantBaseline="central" textAnchor="middle">PRICE $</text><text x={x} y={y} transform={`rotate(-90 ${x} ${y})`} dominantBaseline="central" textAnchor="middle">CSAT</text></g>;
}
function ProductTick(value: { rows: readonly Product[]; [key: string]: unknown }) {
  const { x, y, payload, rows } = value as { x: number; y: number; payload: { value: number }; rows: readonly Product[] };
  return <g transform={`translate(${x} ${y}) rotate(-38)`}><text y={4.25} textAnchor="end" dominantBaseline="central" {...axisText}>{rows[payload.value]?.product}</text></g>;
}

/** A requested view change carries each native mark's actual outline to the next native series. */
export function ScatterMorph({ data, height, width, animate = true, className = '', 'aria-label': label = 'Product price, satisfaction and revenue' }: ScatterMorphProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const [transition, setTransition] = useState<Transition>({ view: 'scatter', from: new Map() }); const { view } = transition; const next = views[(views.indexOf(view) + 1) % views.length]!;
  const completed = useRef<Transition | null>(null);
  useEffect(() => { if (!motion.isAnimationActive) completed.current = transition; }, [motion.isAnimationActive, transition]);
  // Outlines belong to one requested view change. Later data updates use the current native series.
  const currentTransition = completed.current === transition || transition.data !== data ? { ...transition, from: noOutlines } : transition;
  const finishTransition = () => { completed.current = transition; };
  // A container resize can render native shapes without rendering this parent.
  const getTransition = () => completed.current === transition ? { ...transition, from: noOutlines } : currentTransition;

  const { rows, ranked, valid } = useMemo(() => {
    const normalized = data.map((datum, index) => ({ ...datum, index, priceUsd: available(datum.priceUsd), csat: available(datum.csat), revenueK: available(datum.revenueK) }));
    const ordered = [...normalized].sort((a,b) => (b.revenueK ?? -1) - (a.revenueK ?? -1) || a.index - b.index); const rank = new Map(ordered.map((row,index) => [row.id,index]));
    const rows: Product[] = normalized.map(row => ({ ...row, tone: tones[Math.min(5, Math.floor((rank.get(row.id) ?? 0) / 2))]!, areaValue: (row.revenueK ?? 0) * Math.PI * 0.36 }));
    return { rows, ranked: [...rows].sort((a,b) => (b.revenueK ?? -1) - (a.revenueK ?? -1) || a.index - b.index), valid: rows.length > 0 && rows.every(row => row.id.length > 0) && new Set(rows.map(row=>row.id)).size === rows.length };
  }, [data]);
  const total = ranked.reduce((sum,row)=>sum+(row.revenueK ?? 0),0); const hasData = valid && (view === 'scatter' ? rows.some(row=>row.priceUsd !== null && row.csat !== null && row.revenueK !== null) : view === 'bar' ? rows.some(row=>row.revenueK !== null) : ranked.every(row=>row.revenueK !== null) && total > 0);
  const advance = () => {
    const from = new Map<string, readonly Point[]>();
    if (motion.isAnimationActive) ref.current?.querySelectorAll<SVGGElement>('[data-nx-product-id]').forEach(group => {
      const key = group.getAttribute('data-nx-product-id'); const geometry = group.querySelector<SVGGeometryElement>('[data-nx-moving-mark], [data-nx-native-mark][data-nx-visible="true"] :is(path,circle,rect)');
      if (key && geometry) { const points = outline(geometry); if (points.length) from.set(key,points); }
    });
    setTransition({ view: next, from, data });
  };
  const tooltip = <Tooltip cursor={false} shared={false} filterNull={false} isAnimationActive={false} content={({ active, payload }) => {
    const row = payload?.[0]?.payload as Product | undefined; if (!active || !row) return null;
    const text = view === 'scatter' ? row.priceUsd === null || row.csat === null ? 'Unavailable' : `$${row.priceUsd} · CSAT ${row.csat}` : row.revenueK === null ? 'Unavailable' : `$${row.revenueK}K${view === 'donut' ? ` · ${Number((row.revenueK / total * 100).toFixed(2))}%` : ''}`;
    return <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.product} — {text}</div>;
  }} />;
  const description = 'Click the plot or activate its button to advance between scatter, ranked revenue bars and revenue-share donut. Each product retains its revenue-ranked tone. Use left/right arrows to inspect the current native series. Reduced motion changes views immediately.';
  return <div ref={ref} className={`nx-scatter-morph flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="scatter-morph" data-nx-animated={motion.isAnimationActive} data-nx-view={view}>
    <div className={height === undefined ? 'relative aspect-[580/320] min-h-[256px] w-full' : 'relative min-h-0 flex-1'}>
      <button type="button" onClick={advance} aria-label={`Showing ${captions[view].toLowerCase()}. Show ${next} instead.`} className="pointer-events-none absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus-visible:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)] focus-visible:outline-offset-4" />
      <div className="h-full cursor-pointer" onClick={advance}>
        <span data-nx-view-caption className="pointer-events-none absolute left-[5px] top-[5px] z-10 text-[length:calc(var(--nx-type-axis-size)*9/8)] font-[number:var(--nx-font-weight-bold)] leading-none text-[var(--nx-markMuted)]">{captions[view]}</span>
        {!hasData ? <div className="flex h-full items-center text-[var(--nx-muted)]" role="status">{valid && view === 'donut' && ranked.every(row=>row.revenueK !== null) && total === 0 ? 'Total revenue is zero.' : 'No complete product readings available for this view.'}</div> : <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
          {view === 'scatter' ? <ScatterChart accessibilityLayer title={label} desc={description} className={focusClass} margin={{ top: 34, bottom: 0, left: 0, right: 20 }}>
            <CartesianGrid stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-mark)" />
            <XAxis dataKey="priceUsd" type="number" domain={[5,26]} ticks={[5,10,15,20,25,26]} allowDataOverflow axisLine={false} tickLine={false} tickSize={0} height={40} interval={0} tickMargin={8} tick={axisText} />
            <YAxis dataKey="csat" type="number" domain={[6,9.6]} ticks={[6,7,8,9,9.6]} allowDataOverflow axisLine={false} tickLine={false} tickSize={0} width={56} tickMargin={8} tick={axisText} />
            <AxisNames /><ZAxis dataKey="areaValue" domain={[0,Math.max(1,...rows.map(row=>row.areaValue))]} range={[0,Math.max(1,...rows.map(row=>row.areaValue))]} />{tooltip}
            <Scatter id={`${id}-scatter`} data={rows} shape={value=><ScatterProduct value={value} transition={getTransition()} enabled={motion.isAnimationActive}/>} activeShape={false} fill="var(--nx-ink)" {...motion} onAnimationEnd={finishTransition} animationInterpolateFn={currentTransition.from.size ? finalItems : undefined} />
          </ScatterChart> : view === 'bar' ? <BarChart data={ranked.map((row,index)=>({...row,category:index}))} accessibilityLayer title={label} desc={description} className={focusClass} margin={{ top: 34, bottom: 0, left: 0, right: 16 }} barCategoryGap="16%">
            <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-mark)" />
            <XAxis dataKey="category" type="category" scale="band" interval={0} axisLine={false} tickLine={false} tickSize={0} height={52} tickMargin={8} tick={value=><ProductTick {...value} rows={ranked}/>} />
            <YAxis type="number" interval={0} tickFormatter={value => value === 520 ? '' : String(value)} ticks={ranked.every(row=>(row.revenueK ?? 0)<=520) ? [0,100,200,300,400,500,520] : undefined} domain={[0,Math.max(520,...ranked.map(row=>row.revenueK ?? 0))]} axisLine={false} tickLine={false} tickSize={0} width={44} tickMargin={8} tick={axisText} />{tooltip}
            <Bar id={`${id}-bar`} dataKey="revenueK" name="Revenue" shape={value=><BarProduct value={value} transition={getTransition()} enabled={motion.isAnimationActive}/>} activeBar={false} fill="var(--nx-ink)" stroke="none" {...motion} onAnimationEnd={finishTransition} animationInterpolateFn={currentTransition.from.size ? finalItems : undefined} />
          </BarChart> : <PieChart accessibilityLayer title={label} desc={description} className={focusClass} margin={{top:0,bottom:0,left:0,right:0}}>{tooltip}
            <Pie id={`${id}-donut`} data={ranked} dataKey="revenueK" nameKey="product" cx="50%" cy="54%" innerRadius="26%" outerRadius="68%" startAngle={90} endAngle={-270} shape={value=><DonutProduct value={value} transition={getTransition()} enabled={motion.isAnimationActive}/>} activeShape={false} fill="var(--nx-ink)" stroke="var(--nx-paper)" strokeWidth={2} label={false} labelLine={false} {...motion} onAnimationEnd={finishTransition} animationInterpolateFn={currentTransition.from.size ? finalItems : undefined} />
          </PieChart>}
        </ResponsiveContainer>}
      </div>
    </div>
  </div>;
}
