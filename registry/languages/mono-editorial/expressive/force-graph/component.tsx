'use client';

import { useId, useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, useActiveTooltipDataPoints, useIsTooltipActive, usePlotArea, useXAxisScale, useYAxisScale, useXAxisInverseScale, useYAxisInverseScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { createForceSimulation, forceBounds, type ForceBounds } from '../../../../_shared/force-layout';
import { useForceDrag, pointerInForceSpace } from '../../../../_shared/use-force-drag';
import { forceInterpolator, forceObservation, type ForceScatterPosition } from '../../../../_shared/force-scatter';

export interface ForceGraphDatum { id: string; name: string; syncsK: number | null; tier: 0 | 1 | 2 }
export interface ForceGraphSideRoad { source: string; target: string }
export interface ForceGraphProps {
  data: readonly ForceGraphDatum[];
  hubId: string;
  sideRoads: readonly ForceGraphSideRoad[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Service extends ForceScatterPosition { kind: 'node'; index: number; id: string; name: string; syncsK: number | null; tier: number; diameter: number; areaValue: number; connected: number[] }
interface Link extends ForceScatterPosition { kind: 'edge'; index: number; source: Service; target: Service; width: number | null; sideRoad: boolean; areaValue: number }
type Observation = Service | Link;
const available = (value: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const seed = (i: number, k: number) => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
function graphModel(data: readonly ForceGraphDatum[], hubId: string, sideRoads: readonly ForceGraphSideRoad[]) {
  const nodes: Service[] = data.map((datum, index) => { const syncsK = available(datum.syncsK); const diameter = syncsK === null ? 0 : 8 + syncsK * 0.75; return { ...datum, syncsK, kind: 'node', index, nodeIndex: index, diameter, areaValue: Math.PI * (diameter / 2) ** 2, connected: [], x: 60 + seed(index + 1, 3) * 260, y: 40 + seed(index + 5, 7) * 200 }; });
  const byId = new Map(nodes.map(node => [node.id, node])); const hub = byId.get(hubId); const seen = new Set<string>();
  const links: Link[] = [];
  for (const link of [...nodes.filter(node => node !== hub).map(node => ({ source: node.id, target: hubId, sideRoad: false })), ...sideRoads.map(link => ({ ...link, sideRoad: true }))]) {
    const source = byId.get(link.source); const target = byId.get(link.target); const key = JSON.stringify([link.source, link.target]);
    if (!source || !target || seen.has(key)) continue; seen.add(key);
    source.connected.push(target.index); target.connected.push(source.index);
    links.push({ kind: 'edge', index: links.length, source, target, sourceIndex: source.index, targetIndex: target.index, width: link.sideRoad ? 1.2 : source.syncsK === null ? null : Math.max(0.8, source.syncsK * 0.09), sideRoad: link.sideRoad, areaValue: 0, x: 0, y: 0 });
  }
  const bounds = forceBounds(nodes); const simulation = createForceSimulation(nodes, links.map(link => ({ source: link.source.index, target: link.target.index })), { repulsion: 220, distance: 73, gravity: 0.12, friction: 0.18 }, bounds);
  const frames = simulation.settle(true); return { nodes, links, bounds: forceBounds(frames.flat()), simulation, frames, settled: simulation.snapshot(), valid: nodes.length > 0 && byId.size === nodes.length && !!hub && nodes.some(node => node.syncsK !== null) };
}
type Model = ReturnType<typeof graphModel>;
interface LabelInsets { left: number; right: number; top: number; bottom: number }

/** Measure actual glyphs so scoped fonts and longer caller labels also fit. */
function useLabelInsets(ref: RefObject<HTMLDivElement | null>, model: Model): LabelInsets {
  const [measured, setMeasured] = useState<{ model: Model; insets: LabelInsets } | null>(null);
  useLayoutEffect(() => {
    const root = ref.current; if (!root) return;
    let frame = 0;
    const labels = new Set<SVGTextElement>();
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    const measure = () => {
      const current = new Set(root.querySelectorAll<SVGTextElement>('[data-nx-service-label]'));
      for (const label of labels) if (!current.has(label)) { resize.unobserve(label); labels.delete(label); }
      const insets: LabelInsets = { left: 0, right: 0, top: 0, bottom: 0 };
      for (const label of current) {
        if (!labels.has(label)) { labels.add(label); resize.observe(label); }
        const node = model.nodes[Number(label.dataset.nxServiceLabel)]; if (!node) continue;
        const box = label.getBBox(); const radius = node.diameter / 2; const baseline = label.y.baseVal[0]?.value ?? 0;
        insets.left = Math.max(insets.left, radius);
        insets.right = Math.max(insets.right, radius + 6 + box.width);
        insets.top = Math.max(insets.top, radius, baseline - box.y);
        insets.bottom = Math.max(insets.bottom, radius, box.y + box.height - baseline);
      }
      // Whole pixels avoid subpixel position changes feeding back into the layout.
      for (const key of ['left', 'right', 'top', 'bottom'] as const) insets[key] = Math.ceil(insets[key]);
      setMeasured(previous => previous?.model === model && Object.keys(insets).every(key => previous.insets[key as keyof LabelInsets] === insets[key as keyof LabelInsets]) ? previous : { model, insets });
    };
    // Scatter replaces marks when coordinates change; observe their replacement labels.
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true });
    measure();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); };
  }, [ref, model]);
  const radius = Math.ceil(Math.max(0, ...model.nodes.map(node => node.diameter / 2)));
  return measured?.model === model ? measured.insets : { left: radius, right: radius + 6, top: radius, bottom: radius };
}

function ForceAxes({ bounds }: { bounds: ForceBounds }) {
  const plot = usePlotArea();
  const domains = useMemo(() => {
    const width = Math.max(1, plot?.width ?? 1); const height = Math.max(1, plot?.height ?? 1);
    const scale = Math.min(width / (bounds.right - bounds.left), height / (bounds.bottom - bounds.top));
    const centerX = (bounds.left + bounds.right) / 2; const centerY = (bounds.top + bounds.bottom) / 2;
    return { x: [centerX - width / scale / 2, centerX + width / scale / 2], y: [centerY - height / scale / 2, centerY + height / scale / 2] };
  }, [bounds, plot?.width, plot?.height]);
  return <><XAxis dataKey="x" type="number" domain={domains.x} allowDataOverflow hide /><YAxis dataKey="y" type="number" domain={domains.y} allowDataOverflow reversed hide /></>;
}

function ServiceMark({ value, drag }: { value: unknown; drag: ReturnType<typeof useForceDrag> }) {
  const { payload: row, cx, cy, size } = value as { payload?: Observation; cx?: number; cy?: number; size?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const xInverse = useXAxisInverseScale(); const yInverse = useYAxisInverseScale();
  const active = useIsTooltipActive(); const focus = useActiveTooltipDataPoints<Observation>()?.[0];
  if (!row || cx === undefined || cy === undefined || !xScale || !yScale) return <g />;
  const related = !active || !focus || (row.kind === 'edge' ? focus.kind === 'edge' ? row.index === focus.index : row.source.index === focus.index || row.target.index === focus.index : focus.kind === 'edge' ? row.index === focus.source.index || row.index === focus.target.index : row.index === focus.index || focus.connected.includes(row.index));
  if (row.kind === 'edge') {
    if (row.width === null || !row.from || !row.to) return <g data-nx-unavailable-link={row.index} />;
    return <Curve data-nx-force-link={row.index} data-nx-related={related} type="linear" points={[row.from, row.to].map(p => ({ x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 }))} fill="none" stroke={active && related ? 'var(--nx-ink)' : row.sideRoad ? 'var(--nx-faint)' : 'var(--nx-markQuiet)'} strokeWidth={row.width} opacity={active ? related ? 0.85 : 0.1 : row.sideRoad ? 0.5 : 0.6} />;
  }
  return <g data-nx-force-node={row.index} data-nx-force-position={row.index} data-nx-model-x={row.x} data-nx-model-y={row.y} data-nx-related={related} opacity={related ? 1 : 0.1} className="cursor-grab touch-none active:cursor-grabbing"
    onPointerDown={event => { if (xInverse && yInverse) { const element = event.currentTarget.ownerSVGElement!; drag.start(event, row.index, (x, y) => pointerInForceSpace(element, x, y, xInverse, yInverse)); } }}>
    {row.syncsK !== null && <circle data-nx-service-mark={row.index} cx={cx} cy={cy} r={Math.sqrt(Math.max(0, size ?? 0) / Math.PI)} fill={row.tier === 0 ? 'var(--nx-ink)' : row.tier === 1 ? 'var(--nx-markMuted)' : 'var(--nx-markQuiet)'} />}
    <text data-nx-service-label={row.index} x={cx + row.diameter / 2 + 6} y={cy} dominantBaseline="central" fill={row.tier === 0 ? 'var(--nx-ink)' : 'var(--nx-muted)'} fontSize={row.tier === 0 ? 'calc(var(--nx-type-axis-size) * 10.5 / 8)' : 'calc(var(--nx-type-axis-size) * 9 / 8)'} fontWeight={row.tier === 0 ? 'calc(var(--nx-font-weight-bold) + 100)' : 'var(--nx-font-weight-semibold)'}>{row.name}</text>
  </g>;
}
function ForceSeries({ model, id, motion, drag }: { model: Model; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'>; drag: ReturnType<typeof useForceDrag> }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const rows = useMemo(() => [...model.links, ...model.nodes].map(row => forceObservation(row, drag.positions)), [model, drag.positions]);
  const interpolate = useMemo(() => xScale && yScale ? forceInterpolator(model.frames, xScale, yScale) : undefined, [model, xScale, yScale]);
  const maximum = Math.max(1, ...model.nodes.map(row => row.areaValue));
  return <><ZAxis dataKey="areaValue" domain={[0, maximum]} range={[0, maximum]} /><Scatter className="[clip-path:none]" id={`${id}-network`} data={rows} shape={value => <ServiceMark value={value} drag={drag} />} activeShape={false} fill="var(--nx-ink)" {...motion} isAnimationActive={motion.isAnimationActive && !drag.interacted} animationInterpolateFn={drag.interacted ? undefined : interpolate} animationMatchBy={point => { const row = point.payload as Observation; return `${row.kind}-${row.index}`; }} /></>;
}

/** Recharts observations and scales render the preserved seeded force calculation. */
export function ForceGraph({ data, hubId, sideRoads, height, width, animate = true, className = '', 'aria-label': label = 'Monthly integration syncs' }: ForceGraphProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId(); const model = useMemo(() => graphModel(data, hubId, sideRoads), [data, hubId, sideRoads]);
  const drag = useForceDrag(model); const insets = useLabelInsets(ref, model);
  const bounds = useMemo(() => forceBounds([{ x: model.bounds.left, y: model.bounds.top }, { x: model.bounds.right, y: model.bounds.bottom }, ...drag.settledPositions]), [model, drag.settledPositions]);
  const margin = useMemo(() => ({ top: 14 + insets.top, bottom: 14 + insets.bottom, left: 14 + insets.left, right: 14 + insets.right }), [insets.top, insets.bottom, insets.left, insets.right]);
  return <div ref={ref} className={`nx-force-graph flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="force-graph" data-nx-animated={motion.isAnimationActive}>
    {!model.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No unique service network with an available hub.</div> : <div className={height === undefined ? 'aspect-[560/360] min-h-[288px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 347 }}><ScatterChart accessibilityLayer title={label} desc="Diameter is 8 plus monthly syncs in thousands times 0.75; hub-link width shows sync volume. Drag a service to move its force network. Hover or use left/right arrows to inspect links followed by services and highlight adjacency. Zero retains its baseline; unavailable quantities have no mark."
        className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={margin}>
        <ForceAxes bounds={bounds} />
        <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as Observation | undefined; return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.kind === 'node' ? `${row.name} — ${row.syncsK === null ? 'Unavailable' : `${row.syncsK}k syncs/mo`}` : `${row.source.name} ↔ ${row.target.name}${row.sideRoad ? '' : ` — ${row.source.syncsK === null ? 'Unavailable' : `${row.source.syncsK}k syncs/mo`}`}`}</div> : null; }} />
        <ForceSeries model={model} id={id} motion={motion} drag={drag} />
      </ScatterChart></ResponsiveContainer>
    </div>}
  </div>;
}
