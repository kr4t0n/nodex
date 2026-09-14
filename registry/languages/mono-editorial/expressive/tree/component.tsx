'use client';

import { useId, useMemo } from 'react';
import { hierarchy, tree as tidyTree } from 'd3-hierarchy';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface TreeDatum { name: string; features: readonly string[] }
export interface TreeProps {
  data: readonly TreeDatum[];
  root: string;
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Branch { id: string; name: string; fill: string; children?: Branch[] }
interface TreePoint { id: string; name: string; fill: string; depth: number; leaf: boolean; x: number; y: number; parent: { x: number; y: number } | null; path: string }
const tones = ['var(--nx-ink)', 'var(--nx-markStrong)', 'var(--nx-markMuted)', 'var(--nx-muted)', 'var(--nx-markQuiet)', 'var(--nx-faint)'];
function TreeMark(props: unknown) {
  const { payload: row, cx, cy, isAnimating, animationElapsedTime } = props as { payload?: TreePoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number };
  if (!row || cx === undefined || cy === undefined) return <g />;
  const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  return <g data-nx-tree-node={row.id}>
    <circle data-nx-tree-mark={row.id} cx={cx} cy={cy} r={3.5 * progress} fill={row.fill} />
    <text data-nx-tree-label={row.id} x={cx + (row.leaf ? 8.5 : -8.5)} y={cy} textAnchor={row.leaf ? 'start' : 'end'} dominantBaseline="central" fill={row.depth === 0 ? 'var(--nx-ink)' : row.leaf ? 'var(--nx-muted)' : 'var(--nx-markMuted)'} fontSize={row.depth === 0 ? 'calc(var(--nx-type-note-size) * 11.5 / 11)' : 'calc(var(--nx-type-axis-size) * 10 / 8)'} fontWeight={row.leaf ? 'var(--nx-font-weight-medium)' : 'var(--nx-font-weight-semibold)'}>{row.name}</text>
  </g>;
}
function Branches({ rows }: { rows: readonly TreePoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true">{rows.filter(row => row.parent).map(row => <Curve key={row.id} data-nx-branch={row.id} points={[{ x: xScale(row.parent!.x) ?? 0, y: yScale(row.parent!.y) ?? 0 }, { x: xScale(row.x) ?? 0, y: yScale(row.y) ?? 0 }]} type="bumpX" fill="none" stroke={row.fill} strokeWidth="calc(var(--nx-stroke-mark) * 1.4)" />)}</g>;
}

/** D3 supplies the same tidy hierarchy; native scatter scales, curves and inspection render it. */
export function Tree({ data, root, height, width, animate = true, className = '', 'aria-label': label = 'Product areas and their features' }: TreeProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const rows = useMemo(() => {
    const branch: Branch = { id: 'root', name: root, fill: 'var(--nx-ink)', children: data.map((area, index) => { const fill = tones[Math.min(tones.length - 1, index)]!; return { id: `area-${index}`, name: area.name, fill, children: area.features.map((name, feature) => ({ id: `area-${index}-feature-${feature}`, name, fill })) }; }) };
    const laid = tidyTree<Branch>().size([1, 1])(hierarchy(branch)); const result: TreePoint[] = [];
    laid.eachBefore(node => result.push({ id: node.data.id, name: node.data.name, fill: node.data.fill, depth: node.depth, leaf: !node.children?.length, x: node.y, y: 1 - node.x, parent: node.parent ? { x: node.parent.y, y: 1 - node.parent.x } : null, path: node.ancestors().reverse().map(ancestor => ancestor.data.name).join(' / ') }));
    return result;
  }, [data, root]);
  return <div ref={ref} className={`nx-tree flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="tree" data-nx-animated={motion.isAnimationActive}>
    {!data.length ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No product areas available.</div> : <div className={height === undefined ? 'aspect-[580/320] min-h-[256px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 298 }}>
        <ScatterChart accessibilityLayer title={label} desc="The root leads to caller-ordered areas and their features. Branches stay expanded; all nodes are equal-sized membership marks. Use left/right arrows to inspect each node and its ancestry."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 8, bottom: 8, left: 64, right: 96 }}>
          <XAxis dataKey="x" type="number" domain={[0, 1]} hide /><YAxis dataKey="y" type="number" domain={[0, 1]} hide />
          <Branches rows={rows} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as TreePoint | undefined; return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.path}</div> : null; }} />
          <Scatter id={`${id}-nodes`} data={rows} name="Hierarchy nodes" shape={TreeMark} activeShape={TreeMark} fill="var(--nx-ink)" {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
