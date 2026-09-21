'use client';

import { useId, useMemo } from 'react';
import { forceSimulation, forceCollide, forceX, forceY, forceLink, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, usePlotArea, useXAxisScale, useYAxisScale, useActiveTooltipDataPoints, type AnimationInterpolateFn, type ScatterPointItem } from 'recharts';
import { useChartMotion } from '../use-chart-motion';
import { useSketchSettings, type SketchSettings } from './use-sketch-settings';
import { SketchCircle, SketchSegment } from './marks';
import { sketchSeed, uniqueIds, nonnegative } from './identity';
import { SketchFrame, SketchPlot, SketchStatus, SketchTooltip, sketchFocus, formatNumber, type SketchPresentationProps } from './frame';

export interface SketchForceNode { id: string; label: string; value: number | null; paint: string }
export interface SketchNetworkLink { id: string; source: string; target: string }
interface Node extends SketchForceNode, SimulationNodeDatum { x: number; y: number; radius: number; opacity?: number; neighbours: string[] }
interface Edge { id: string; source: Node; target: Node }
export interface SketchForceLayoutProps extends SketchPresentationProps { data: readonly SketchForceNode[]; links?: readonly SketchNetworkLink[]; kind: 'force' | 'network'; hatchWidth: string }
const compareIds = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Clone caller data. The stopped solver runs a finite, deterministic layout with collisions. */
function layout(data: readonly SketchForceNode[], links: readonly SketchNetworkLink[]) {
  const maximum = Math.max(1, ...data.map(node => nonnegative(node.value) ?? 0));
  const nodes: Node[] = [...data].sort(compareIds).map((datum, index) => {
    const value = nonnegative(datum.value); const angle = index * Math.PI * (3 - Math.sqrt(5)); const distance = 16 * Math.sqrt(index + 0.5);
    return { ...datum, value, radius: 48 * Math.sqrt((value ?? 0) / maximum), x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, neighbours: [] };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  const pairs = new Set<string>();
  const validLinks = uniqueIds(links) && links.every(link => {
    const pair = JSON.stringify([link.source, link.target].sort());
    if (link.source === link.target || !byId.has(link.source) || !byId.has(link.target) || pairs.has(pair)) return false;
    pairs.add(pair); return true;
  });
  const edges: Edge[] = validLinks ? [...links].sort(compareIds).map(link => ({ id: link.id, source: byId.get(link.source)!, target: byId.get(link.target)! })) : [];
  for (const edge of edges) { edge.source.neighbours.push(edge.target.id); edge.target.neighbours.push(edge.source.id); }
  const simulation = forceSimulation(nodes).stop()
    .force('x', forceX(0).strength(0.06)).force('y', forceY(0).strength(0.06))
    .force('collide', forceCollide<Node>(node => Math.max(8, node.radius) + 4).iterations(5));
  if (edges.length) simulation.force('links', forceLink<Node, SimulationLinkDatum<Node>>(edges.map(edge => ({ source: edge.source, target: edge.target })))
    .distance(edge => Math.max(8, (edge.source as Node).radius) + Math.max(8, (edge.target as Node).radius) + 40).strength(0.15));
  simulation.tick(300);
  const left = Math.min(-1, ...nodes.map(node => node.x - Math.max(8, node.radius) - 12));
  const right = Math.max(1, ...nodes.map(node => node.x + Math.max(8, node.radius) + 12));
  const top = Math.min(-1, ...nodes.map(node => node.y - Math.max(8, node.radius) - 12));
  const bottom = Math.max(1, ...nodes.map(node => node.y + Math.max(8, node.radius) + 12));
  // Restore caller order for keyboard traversal; positions are independent of that order.
  const order = new Map(data.map((node, index) => [node.id, index]));
  nodes.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return { nodes, edges, maximum, validLinks, bounds: { left, right, top, bottom } };
}
type Model = ReturnType<typeof layout>;
function Edges({ edges, settings, scale }: { edges: readonly Edge[]; settings: SketchSettings | null; scale: number }) {
  const x = useXAxisScale(); const y = useYAxisScale(); const active = useActiveTooltipDataPoints<Node>()?.[0];
  return <g>{edges.map(edge => {
    const x1 = x?.(edge.source.x); const x2 = x?.(edge.target.x); const y1 = y?.(edge.source.y); const y2 = y?.(edge.target.y);
    if (x1 === undefined || x2 === undefined || y1 === undefined || y2 === undefined) return null;
    const length = Math.hypot(x2 - x1, y2 - y1); if (!length) return null;
    const a = Math.min(0.5, Math.max(8, edge.source.radius) * scale / length); const b = Math.min(0.5, Math.max(8, edge.target.radius) * scale / length);
    const related = !active || active.id === edge.source.id || active.id === edge.target.id;
    return <g key={edge.id} data-nx-sketch-edge={edge.id} data-nx-source={edge.source.id} data-nx-target={edge.target.id}>
      <SketchSegment x1={x1 + (x2 - x1) * a} y1={y1 + (y2 - y1) * a} x2={x2 - (x2 - x1) * b} y2={y2 - (y2 - y1) * b} settings={settings} seed={sketchSeed(edge.id)} paint="var(--nx-ink)" opacity={related ? 1 : 0.2} />
    </g>;
  })}</g>;
}
function Mark({ value, settings, hatchWidth }: { value: unknown; settings: SketchSettings | null; hatchWidth: string }) {
  const { cx, cy, size, payload: node } = value as { cx: number; cy: number; size: number; payload: Node };
  const active = useActiveTooltipDataPoints<Node>()?.[0];
  const related = !active || active.id === node.id || node.neighbours.includes(active.id);
  return <g data-nx-sketch-node={node.id} data-nx-value={node.value ?? 'unavailable'} data-nx-model-x={node.x} data-nx-model-y={node.y} opacity={(node.opacity ?? 1) * (related ? 1 : 0.3)}>
    {node.value !== null && node.value > 0 ? <SketchCircle cx={cx} cy={cy} radius={Math.sqrt(Math.max(0, size) / Math.PI)} settings={settings} seed={sketchSeed(node.id)} paint={node.paint} hatchWidth={hatchWidth} />
      : <><circle cx={cx} cy={cy} r={8} fill="transparent" /><text x={cx} y={cy} dominantBaseline="central" textAnchor="middle" fill="var(--nx-ink)" fontFamily="var(--nx-font-heading)" fontSize="var(--nx-type-axis-size)">{node.value === null ? '—' : '0'}</text></>}
  </g>;
}
// Recharts owns the animation clock. Fade at final coordinates so edges stay attached during updates.
const fade: AnimationInterpolateFn<ScatterPointItem, 'horizontal' | 'vertical'> = (items, progress) => (items ?? []).flatMap(item => item.status === 'removed' ? [] : [{ ...item.next, payload: { ...item.next.payload, opacity: progress } }]);
function FittedSeries({ model, settings, hatchWidth, id, motion }: { model: Model; settings: SketchSettings | null; hatchWidth: string; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }) {
  const plot = usePlotArea(); const { left, right, top, bottom } = model.bounds;
  const w = Math.max(1, plot?.width ?? 600); const h = Math.max(1, plot?.height ?? 300);
  const scale = Math.min(w / (right - left), h / (bottom - top), 1.5);
  const cx = (left + right) / 2; const cy = (top + bottom) / 2;
  return <>
    <XAxis type="number" dataKey="x" domain={[cx - w / scale / 2, cx + w / scale / 2]} allowDataOverflow hide />
    <YAxis type="number" dataKey="y" domain={[cy - h / scale / 2, cy + h / scale / 2]} allowDataOverflow reversed hide />
    <ZAxis dataKey="value" domain={[0, model.maximum]} range={[0, Math.PI * (48 * scale) ** 2]} />
    <Edges edges={model.edges} settings={settings} scale={scale} />
    <Scatter id={id} data={model.nodes} name="Observations" fill="var(--nx-ink)" activeShape={false} shape={(value: unknown) => <Mark value={value} settings={settings} hatchWidth={hatchWidth} />} {...motion} animationInterpolateFn={fade} />
  </>;
}
const noLinks: readonly SketchNetworkLink[] = [];
export function SketchForceLayout({ data, links = noLinks, kind, hatchWidth, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber, width, height, animate = true, className = '', 'aria-label': label = 'Force positioned observations' }: SketchForceLayoutProps) {
  const { ref, ...motion } = useChartMotion(animate); const settings = useSketchSettings(ref); const id = useId();
  const model = useMemo(() => layout(data, links), [data, links]);
  const status = !data.length ? 'No observations available.' : !uniqueIds(data) ? 'Each node needs a unique, nonempty ID.' : !model.validLinks ? 'Links need unique IDs, distinct existing endpoints and no duplicate pairs.' : !model.nodes.some(node => node.value !== null) ? 'No observations available.' : null;
  return <SketchFrame ref={ref} slug={`sketch-${kind}`} animated={motion.isAnimationActive} {...{ unitLabel, contextLabel, width, height, className }}>
    {status ? <SketchStatus>{status}</SketchStatus> : <SketchPlot height={height} minWidth={280}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}><ScatterChart accessibilityLayer title={label} className={sketchFocus} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
        desc={`Bubble area is proportional to ${unitLabel}, normalized within this dataset. Position is a deterministic force layout, not a numeric axis. ${kind === 'network' ? 'Lines are caller-supplied undirected relationships.' : 'There are no implied links.'} Zero and missing values use text instead of an area mark. Use left and right arrows to inspect nodes.`}>
        <Tooltip cursor={false} filterNull={false} isAnimationActive={false} content={({ active, payload }) => { const node = payload?.[0]?.payload as Node | undefined; return active && node ? <SketchTooltip><div>{node.label}</div><div>{node.value === null ? 'Unavailable' : `${valueFormatter(node.value)} ${unitLabel}`}</div>{kind === 'network' && <div>{node.neighbours.length} connections</div>}</SketchTooltip> : null; }} />
        <FittedSeries model={model} settings={settings} hatchWidth={hatchWidth} id={id} motion={motion} />
      </ScatterChart></ResponsiveContainer>
    </SketchPlot>}
  </SketchFrame>;
}
