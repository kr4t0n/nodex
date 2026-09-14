'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { Curve, Rectangle, ResponsiveContainer, Sankey, Tooltip, useActiveTooltipDataPoints, useIsTooltipActive, type SankeyNodeProps, type SankeyLinkProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import './component.css';

export interface AggregateSankeyDatum { channel: string; toPlans: readonly (number | null)[] }
export interface AggregateSankeyProps {
  data: readonly AggregateSankeyDatum[];
  plans: readonly string[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface FlowNode { nodeId: string; name: string; kind: 'channel' | 'plan'; originalIndex: number; rank: number; fill: string; neighbors: readonly string[]; value?: number }
interface FlowLink { source: FlowNode; target: FlowNode; value: number; linkId: string }
interface FlowTooltipPoint { payload: FlowNode | FlowLink; name: string; value: number }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
const KeyboardFlow = createContext<FlowNode | FlowLink | null>(null);
function useInspectedFlow() { const keyboard = useContext(KeyboardFlow); const points = useActiveTooltipDataPoints<FlowTooltipPoint>(); const active = useIsTooltipActive(); return keyboard ?? (active ? points?.[0]?.payload ?? null : null); }
function describeFlow(flow: FlowNode | FlowLink, total: number) { return 'source' in flow ? `${flow.source.name} → ${flow.target.name} — ${flow.value} accounts of ${total}` : `${flow.name} — ${flow.value ?? 0} accounts`; }
function AllocationNode({ x, y, width, height, payload }: SankeyNodeProps) {
  const node = payload as unknown as FlowNode; const focus = useInspectedFlow();
  const related = !focus || ('source' in focus ? focus.source.nodeId === node.nodeId || focus.target.nodeId === node.nodeId : focus.nodeId === node.nodeId || focus.neighbors.includes(node.nodeId));
  const channel = node.kind === 'channel';
  return <g data-nx-flow-node={node.nodeId} data-nx-related={related} opacity={related ? 1 : 0.1}>
    {height > 0 && <Rectangle data-nx-node-block={node.nodeId} x={x} y={y} width={width} height={height} fill={node.fill} stroke="none" />}
    <text data-nx-node-label={node.nodeId} x={channel ? x - 5 : x + width + 5} y={y + height / 2} textAnchor={channel ? 'end' : 'start'} dominantBaseline="central" fill={channel && node.rank >= 2 ? 'var(--nx-markMuted)' : 'var(--nx-ink)'} fontSize={channel ? 'var(--nx-type-axis-size)' : 'calc(var(--nx-type-axis-size) * 8.5 / 8)'} fontWeight={channel ? 'var(--nx-type-cardTitle-weight)' : 'var(--nx-type-pageTitle-weight)'}>{node.name}</text>
  </g>;
}
function AllocationRibbon({ sourceX, targetX, sourceY, targetY, linkWidth, payload }: SankeyLinkProps) {
  const link = payload as unknown as FlowLink; const focus = useInspectedFlow();
  const related = !focus || ('source' in focus ? focus.linkId === link.linkId : focus.nodeId === link.source.nodeId || focus.nodeId === link.target.nodeId);
  if (linkWidth <= 0) return <g data-nx-zero-link={link.linkId} />;
  return <Curve data-nx-allocation={link.linkId} data-nx-thickness={linkWidth} data-nx-related={related} points={[{ x: sourceX, y: sourceY - linkWidth / 2 }, { x: targetX, y: targetY - linkWidth / 2 }]} baseLine={[{ x: sourceX, y: sourceY + linkWidth / 2 }, { x: targetX, y: targetY + linkWidth / 2 }]} type="bumpX" fill={link.source.fill} fillOpacity={related ? 0.5 : 0.08} stroke="none" />;
}

/** Native Sankey layout owns weighted node heights, link offsets, topology and inspection. */
export function AggregateSankey({ data, plans, height, width, animate = true, className = '', 'aria-label': label = 'Acquisition channels flowing into plans' }: AggregateSankeyProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const [keyboard, setKeyboard] = useState<{ data: readonly AggregateSankeyDatum[]; plans: readonly string[]; index: number } | null>(null);
  const layout = useMemo(() => {
    const ranked = data.map((row, originalIndex) => ({ ...row, originalIndex, valid: row.toPlans.length === plans.length && row.toPlans.every((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0), total: row.toPlans.reduce<number>((sum, value) => sum + (value ?? 0), 0) })).sort((a, b) => b.total - a.total || a.originalIndex - b.originalIndex);
    const total = ranked.reduce((sum, row) => sum + row.total, 0);
    const valid = plans.length > 0 && ranked.length > 0 && ranked.every(row => row.valid) && Number.isFinite(total);
    const nodes: FlowNode[] = [...ranked.map((row, rank): FlowNode => ({ nodeId: `channel-${row.originalIndex}`, name: row.channel, kind: 'channel', originalIndex: row.originalIndex, rank, fill: tones[rank] ?? 'var(--nx-ink)', neighbors: row.toPlans.flatMap((value, index) => value !== null && value > 0 ? [`plan-${index}`] : []) })), ...plans.map((name, index): FlowNode => ({ nodeId: `plan-${index}`, name, kind: 'plan', originalIndex: index, rank: index, fill: 'var(--nx-ink)', neighbors: ranked.filter(row => (row.toPlans[index] ?? 0) > 0).map(row => `channel-${row.originalIndex}`) }))];
    // Zero-valued relationships preserve their real columns without contributing any ribbon area.
    const links = valid ? ranked.flatMap((row, source) => row.toPlans.map((value, target) => ({ source, target: ranked.length + target, value: value!, linkId: `${row.originalIndex}-${target}` }))) : [];
    for (const node of nodes) node.value = node.kind === 'channel' ? ranked[node.rank]!.total : ranked.reduce((sum, row) => sum + (row.toPlans[node.originalIndex] ?? 0), 0);
    const observations: (FlowNode | FlowLink)[] = [...nodes, ...links.map(link => ({ ...link, source: nodes[link.source]!, target: nodes[link.target]! }))];
    return { valid, total, observations, data: { nodes, links } };
  }, [data, plans]);
  const keyboardIndex = keyboard?.data === data && keyboard.plans === plans ? keyboard.index : null;
  const inspected = keyboardIndex === null ? null : layout.observations[keyboardIndex] ?? null;
  return <div ref={ref} className={`nx-aggregate-sankey flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="aggregate-sankey" data-nx-animated={motion.isAnimationActive}
    onPointerMoveCapture={() => setKeyboard(null)}
    onFocusCapture={event => { if (event.target instanceof SVGSVGElement) event.stopPropagation(); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboard(null); }}
    onKeyDownCapture={event => {
      if (!(event.target instanceof SVGSVGElement) || !layout.valid || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
      // Recharts' generic keyboard handler cannot address Sankey's string node/link indices.
      // Keep its focusable surface and pointer events; traverse these actual observations locally.
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'Escape') { setKeyboard(null); return; }
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? layout.observations.length - 1 : keyboardIndex === null ? 0 : Math.max(0, Math.min(layout.observations.length - 1, keyboardIndex + (event.key === 'ArrowRight' ? 1 : -1)));
      setKeyboard({ data, plans, index });
    }}>
    {!layout.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete channel allocation available.</div> : <div className={height === undefined ? 'relative aspect-[720/320] min-h-[256px] w-full' : 'relative min-h-0 flex-1'}>
      <KeyboardFlow value={inspected}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 240 }}>
        <Sankey data={layout.data} accessibilityLayer title={label} desc="Ribbon thickness shows accounts flowing from each channel into a plan. Channel order and tone rank total volume; zero flows have no ribbon. Use left/right arrows to inspect nodes then links, Home/End for the limits and Escape to clear."
          className="nx-allocation-plot [&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" nodeWidth={8} nodePadding={12} iterations={0} sort={false} verticalAlign="top" linkCurvature={0.5} margin={{ top: 20, bottom: 20, left: 76, right: 66 }} node={AllocationNode} link={AllocationRibbon}>
          <Tooltip active={inspected ? false : undefined} cursor={false} isAnimationActive={false} content={({ active, payload }) => { const flow = (payload?.[0]?.payload as FlowTooltipPoint | undefined)?.payload;
            return active && flow ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{describeFlow(flow, layout.total)}</div> : null;
          }} />
        </Sankey>
      </ResponsiveContainer></KeyboardFlow>
      {inspected && <div role="status" className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{describeFlow(inspected, layout.total)}</div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-muted)]">RIBBON THICKNESS = ACCOUNTS · TONE = WHERE THEY CAME FROM</div>
    </div>}
  </div>;
}
