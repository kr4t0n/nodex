'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, useActiveTooltipDataPoints, useIsTooltipActive, useXAxisScale, useYAxisScale, useXAxisInverseScale, useYAxisInverseScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { createForceSimulation, forceBounds } from '../../../../_shared/force-layout';
import { useForceDrag, pointerInForceSpace } from '../../../../_shared/use-force-drag';
import { forceInterpolator, forceObservation, type ForceScatterPosition } from '../../../../_shared/force-scatter';
import { quadraticChord } from '../../../../_shared/circular-layout';

export interface ForceGraphDenseDatum { id: string; name: string; callsK: number | null; hub: boolean; domainIndex: number }
export interface ForceGraphDenseEdge { source: string; target: string; width: number | null; treatment: 'spoke' | 'shortcut' | 'backbone' | 'stray' }
export interface ForceGraphDenseProps {
  data: readonly ForceGraphDenseDatum[];
  edges: readonly ForceGraphDenseEdge[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Service extends ForceScatterPosition { kind: 'node'; index: number; id: string; name: string; callsK: number | null; hub: boolean; domainIndex: number; diameter: number; areaValue: number; connected: number[] }
interface Link extends ForceScatterPosition { kind: 'edge'; index: number; source: Service; target: Service; width: number | null; treatment: ForceGraphDenseEdge['treatment']; areaValue: number }
type Observation = Service | Link;
const available = (value: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const seed = (i: number, k: number) => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const tones = ['var(--nx-ink)', 'var(--nx-markHeavy)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-markMedium)', 'var(--nx-muted)', 'var(--nx-markLight)', 'var(--nx-markQuiet)'];
function graphModel(data: readonly ForceGraphDenseDatum[], edges: readonly ForceGraphDenseEdge[]) {
  const nodes: Service[] = data.map((datum, index) => { const callsK = available(datum.callsK); const diameter = callsK === null ? 0 : datum.hub ? 16 + Math.sqrt(callsK) * 1.6 : 2.5 + Math.sqrt(callsK) * 1.5; return { ...datum, callsK, kind: 'node', index, nodeIndex: index, diameter, areaValue: Math.PI * (diameter / 2) ** 2, connected: [], x: 40 + seed(index + 1, 3) * 280, y: 30 + seed(index + 5, 7) * 220 }; });
  const byId = new Map(nodes.map(node => [node.id, node])); const seen = new Set<string>(); const links: Link[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.source); const target = byId.get(edge.target); const key = JSON.stringify([edge.source, edge.target]);
    if (!source || !target || seen.has(key)) continue; seen.add(key); source.connected.push(target.index); target.connected.push(source.index);
    links.push({ kind: 'edge', index: links.length, source, target, sourceIndex: source.index, targetIndex: target.index, width: available(edge.width), treatment: edge.treatment, curve: edge.treatment === 'backbone' ? 0.08 : edge.treatment === 'stray' ? 0.15 : 0, areaValue: 0, x: 0, y: 0 });
  }
  const bounds = forceBounds(nodes); const simulation = createForceSimulation(nodes, links.map(link => ({ source: link.source.index, target: link.target.index })), { repulsion: 46, distance: 26, gravity: 0.16, friction: 0.22 }, bounds);
  const frames = simulation.settle(true); return { nodes, links, bounds, simulation, frames, settled: simulation.snapshot(), valid: nodes.length > 0 && byId.size === nodes.length && nodes.every(node => Number.isSafeInteger(node.domainIndex) && node.domainIndex >= 0) && nodes.some(node => node.callsK !== null) };
}
type Model = ReturnType<typeof graphModel>;
interface View { model: Model; zoom: number; x: number; y: number }
function useMeshViewport(model: Model, ref: RefObject<HTMLDivElement | null>) {
  const [changed, setChanged] = useState<View | null>(null);
  const view = useMemo(() => changed?.model === model ? changed : { model, zoom: 1, x: 0, y: 0 }, [changed, model]);
  const drag = useRef<{ pointer: number; element: HTMLDivElement; startX: number; startY: number; view: View; unitX: number; unitY: number } | null>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const wheel = (event: WheelEvent) => {
      const svg = root.querySelector('svg.recharts-surface'); if (!svg || !(event.target instanceof Element) || !svg.contains(event.target)) return;
      event.preventDefault(); const bounds = svg.getBoundingClientRect(); const width = Number(svg.getAttribute('width')); const height = Number(svg.getAttribute('height')); if (!width || !height || !bounds.width || !bounds.height) return;
      const ratioX = ((event.clientX - bounds.left) * width / bounds.width - 6) / Math.max(1, width - 12); const ratioY = ((event.clientY - bounds.top) * height / bounds.height - 6) / Math.max(1, height - 12);
      setChanged(previous => {
        const old = previous?.model === model ? previous : { model, zoom: 1, x: 0, y: 0 }; const zoom = Math.min(10000, Math.max(0.0001, old.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
        return { model, zoom, x: old.x + ratioX * (model.bounds.right - model.bounds.left) * (1 / old.zoom - 1 / zoom), y: old.y + ratioY * (model.bounds.bottom - model.bounds.top) * (1 / old.zoom - 1 / zoom) };
      });
    };
    root.addEventListener('wheel', wheel, { passive: false });
    return () => { root.removeEventListener('wheel', wheel); const held = drag.current; drag.current = null; if (held?.element.hasPointerCapture(held.pointer)) held.element.releasePointerCapture(held.pointer); };
  }, [model, ref]);
  return {
    view, interacted: changed?.model === model,
    start(event: ReactPointerEvent<HTMLDivElement>) {
      if (event.button !== 0 || !(event.target instanceof Element) || !event.target.closest('svg.recharts-surface')) return;
      const svg = event.currentTarget.querySelector('svg.recharts-surface'); if (!svg) return; const bounds = svg.getBoundingClientRect(); const width = Number(svg.getAttribute('width')); const height = Number(svg.getAttribute('height'));
      if (!bounds.width || !bounds.height || width <= 12 || height <= 12) return;
      event.preventDefault(); drag.current = { pointer: event.pointerId, element: event.currentTarget, startX: event.clientX, startY: event.clientY, view, unitX: (model.bounds.right - model.bounds.left) / view.zoom / (width - 12) * width / bounds.width, unitY: (model.bounds.bottom - model.bounds.top) / view.zoom / (height - 12) * height / bounds.height }; event.currentTarget.setPointerCapture(event.pointerId);
    },
    move(event: ReactPointerEvent<HTMLDivElement>) { const held = drag.current; if (held?.pointer === event.pointerId) setChanged({ ...held.view, x: held.view.x - (event.clientX - held.startX) * held.unitX, y: held.view.y - (event.clientY - held.startY) * held.unitY }); },
    end(event: ReactPointerEvent<HTMLDivElement>) { const held = drag.current; if (held?.pointer !== event.pointerId) return; drag.current = null; if (held.element.hasPointerCapture(held.pointer)) held.element.releasePointerCapture(held.pointer); },
  };
}
function ServiceMark({ value, drag }: { value: unknown; drag: ReturnType<typeof useForceDrag> }) {
  const { payload: row, cx, cy, size } = value as { payload?: Observation; cx?: number; cy?: number; size?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const xInverse = useXAxisInverseScale(); const yInverse = useYAxisInverseScale();
  const active = useIsTooltipActive(); const focus = useActiveTooltipDataPoints<Observation>()?.[0];
  if (!row || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const related = !active || !focus || (row.kind === 'edge' ? focus.kind === 'edge' ? row.index === focus.index : row.source.index === focus.index || row.target.index === focus.index : focus.kind === 'edge' ? row.index === focus.source.index || row.index === focus.target.index : row.index === focus.index || focus.connected.includes(row.index));
  if (row.kind === 'edge') {
    if (row.width === null || row.width === 0 || !row.from || !row.to || !row.control) return <g data-nx-unavailable-link={row.index} />;
    const opacity = row.treatment === 'backbone' ? 0.65 : row.treatment === 'shortcut' ? 0.4 : row.treatment === 'stray' ? 0.38 : 0.5;
    const stroke = row.treatment === 'backbone' ? 'var(--nx-markQuiet)' : row.treatment === 'shortcut' ? 'var(--nx-grid)' : row.treatment === 'stray' ? 'var(--nx-plotGrid)' : 'var(--nx-faint)';
    return <Curve data-nx-force-link={row.index} data-nx-related={related} type={quadraticChord} points={[row.from, row.control, row.to].map(p => ({ x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 }))} fill="none" stroke={active && related ? 'var(--nx-ink)' : stroke} strokeWidth={active && related ? 1.4 : row.width} opacity={active ? related ? 0.9 : 0.03 : opacity} />;
  }
  const radius = Math.sqrt(Math.max(0, size ?? 0) / Math.PI); const inspected = active && focus?.kind === 'node' && focus.index === row.index;
  return <g data-nx-force-node={row.index} data-nx-force-position={row.index} data-nx-model-x={row.x} data-nx-model-y={row.y} data-nx-related={related} opacity={related ? 1 : 0.1} className="cursor-grab touch-none active:cursor-grabbing"
    onPointerDown={event => { if (xInverse && yInverse) { const element = event.currentTarget.ownerSVGElement!; drag.start(event, row.index, (x, y) => pointerInForceSpace(element, x, y, xInverse, yInverse)); } }}>
    {row.callsK !== null && <circle data-nx-service-mark={row.index} cx={cx} cy={cy} r={radius} fill={tones[row.domainIndex % tones.length]} stroke={row.hub ? 'var(--nx-paper)' : 'none'} strokeWidth={row.hub ? 2 : 0} />}
    {(row.hub || inspected) && <text data-nx-service-label={row.index} x={inspected ? cx + radius + 5 : cx} y={cy} textAnchor={inspected ? 'start' : 'middle'} dominantBaseline="central" fill={inspected ? 'var(--nx-ink)' : 'var(--nx-paper)'} fontSize="calc(var(--nx-type-axis-size) * 9.5 / 8)" fontWeight="calc(var(--nx-font-weight-bold) + 100)">{row.name}</text>}
  </g>;
}
function ForceSeries({ model, id, motion, zoom, roaming }: { model: Model; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'>; zoom: number; roaming: boolean }) {
  const drag = useForceDrag(model); const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const rows = useMemo(() => [...model.links, ...model.nodes].map(row => forceObservation(row, drag.positions)), [model, drag.positions]);
  const interpolate = useMemo(() => xScale && yScale ? forceInterpolator(model.frames, xScale, yScale) : undefined, [model, xScale, yScale]);
  const maximum = Math.max(1, ...model.nodes.map(row => row.areaValue)); const nodeScale = (zoom - 1) * 0.6 + 1;
  return <><ZAxis dataKey="areaValue" domain={[0, maximum]} range={[0, maximum * nodeScale ** 2]} /><Scatter className="[clip-path:none]" id={`${id}-network`} data={rows} shape={value => <ServiceMark value={value} drag={drag} />} activeShape={false} fill="var(--nx-ink)" {...motion} isAnimationActive={motion.isAnimationActive && !drag.interacted && !roaming} animationInterpolateFn={drag.interacted || roaming ? undefined : interpolate} animationMatchBy={point => { const row = point.payload as Observation; return `${row.kind}-${row.index}`; }} /></>;
}

/** Native scatter observations retain the original force physics, node dragging and viewport roaming. */
export function ForceGraphDense({ data, edges, height, width, animate = true, className = '', 'aria-label': label = 'Daily calls across service domains' }: ForceGraphDenseProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId(); const model = useMemo(() => graphModel(data, edges), [data, edges]); const viewport = useMeshViewport(model, ref); const { view } = viewport;
  const domains = useMemo(() => ({ x: [model.bounds.left + view.x, model.bounds.left + view.x + (model.bounds.right - model.bounds.left) / view.zoom], y: [model.bounds.top + view.y, model.bounds.top + view.y + (model.bounds.bottom - model.bounds.top) / view.zoom] }), [model, view]);
  return <div ref={ref} className={`nx-force-graph-dense flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="force-graph-dense" data-nx-animated={motion.isAnimationActive} data-nx-zoom={view.zoom}
    onPointerDown={viewport.start} onPointerMove={viewport.move} onPointerUp={viewport.end} onPointerCancel={viewport.end} onLostPointerCapture={viewport.end}>
    {!model.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No unique service mesh with available calls.</div> : <div className={height === undefined ? 'aspect-[560/420] min-h-[320px] w-full touch-none' : 'min-h-0 flex-1 touch-none'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 405 }}><ScatterChart accessibilityLayer title={label} desc="Hub diameter is 16 plus square-root daily calls in thousands times 1.6; satellite diameter is 2.5 plus square-root calls times 1.5. Link width is caller-supplied traffic weight. Drag nodes to move the force network, drag the background to pan, and scroll over the chart to zoom. Hover or use left/right arrows to inspect links followed by services and highlight adjacency. Unavailable counts have no mark."
        className="cursor-grab [&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <XAxis dataKey="x" type="number" domain={domains.x} allowDataOverflow hide /><YAxis dataKey="y" type="number" domain={domains.y} allowDataOverflow reversed hide />
        <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as Observation | undefined; return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.kind === 'node' ? `${row.name} — ${row.callsK === null ? 'Unavailable' : `${row.callsK}k calls/day`}` : `${row.source.name} ↔ ${row.target.name}${row.width === null ? ' — Unavailable' : ''}`}</div> : null; }} />
        <ForceSeries model={model} id={id} motion={motion} zoom={view.zoom} roaming={viewport.interacted} />
      </ScatterChart></ResponsiveContainer>
    </div>}
  </div>;
}
