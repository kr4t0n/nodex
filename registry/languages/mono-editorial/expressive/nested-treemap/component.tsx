'use client';

import { createContext, useContext, useId, useLayoutEffect, useMemo, useState } from 'react';
import { Rectangle, Treemap, type TreemapNode } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface NestedTreemapTeam { name: string; hours: number | null }
export interface NestedTreemapDatum { name: string; teams: readonly NestedTreemapTeam[] }
export interface NestedTreemapProps {
  data: readonly NestedTreemapDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Effort { id: string; name: string; hours: number; areaIndex: number; areaName: string; kind: 'area' | 'team' }
interface Area extends Effort { teams: Effort[] }
interface EffortContext { active: Effort | null; inspect: (effort: Effort) => void; total: number; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }
const EffortScope = createContext<EffortContext | null>(null);
function TeamCell(node: TreemapNode) {
  const scope = useContext(EffortScope); const row = node.effort as Effort | undefined;
  if (!scope || !row || node.depth === 0 || row.hours <= 0) return <g />;
  const x = node.x + 3.5; const y = node.y + 3.5; const width = Math.max(0, node.width - 7); const height = Math.max(0, node.height - 7);
  if (!width || !height) return <g />;
  const active = scope.active?.id === row.id; const clip = `${scope.id}-${row.id}`;
  return <g data-nx-effort-team={row.id}>
    <defs><clipPath id={clip}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
    <Rectangle data-nx-effort-cell={row.id} x={x} y={y} width={width} height={height} fill="var(--nx-markDeep)" stroke={active ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-emphasis)" />
    <text data-nx-effort-label={row.id} x={x + 8} y={y + 19} dominantBaseline="central" clipPath={`url(#${clip})`} fill="var(--nx-paper)" fontSize="calc(var(--nx-type-plotValue-size) * 12 / 17)" fontWeight="var(--nx-type-plotValue-weight)">{row.name}<tspan x={x + 8} dy={18}>{row.hours} h</tspan></text>
  </g>;
}
function AreaCell(node: TreemapNode) {
  const scope = useContext(EffortScope); const area = node.effort as Area | undefined;
  const teams = useMemo(() => area?.teams.filter(team => team.hours > 0).map(effort => ({ name: effort.name, value: effort.hours, effort })) ?? [], [area]);
  if (!scope || !area || node.depth === 0 || area.hours <= 0) return <g />;
  const x = node.x + 2.5; const y = node.y + 2.5; const width = Math.max(0, node.width - 5); const height = Math.max(0, node.height - 5);
  if (!width || !height) return <g />;
  const active = scope.active?.areaIndex === area.areaIndex; const innerWidth = Math.max(0, width - 3); const innerHeight = Math.max(0, height - 32); const clip = `${scope.id}-${area.id}-heading`;
  return <g data-nx-effort-area={area.id} data-nx-related={active}>
    <defs><clipPath id={clip}><rect x={x + 3} y={y} width={Math.max(0, width - 6)} height={Math.min(32, height)} /></clipPath></defs>
    <Rectangle data-nx-area-frame={area.id} x={x} y={y} width={width} height={height} fill="var(--nx-paper)" stroke={active ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-emphasis)" />
    <text data-nx-area-heading={area.id} x={x + 13} y={y + 16} dominantBaseline="central" clipPath={`url(#${clip})`} fill="var(--nx-ink)" fontSize="calc(var(--nx-type-axis-size) * 10 / 8)" fontWeight="var(--nx-font-weight-bold)">{area.name} · {Math.round(area.hours / scope.total * 100)}%</text>
    {innerWidth > 0 && innerHeight > 0 && <foreignObject x={x + 1.5} y={y + 30.5} width={innerWidth} height={innerHeight}>
      <Treemap width={innerWidth} height={innerHeight} data={teams} aspectRatio={1.2} nodeGap={0} nodeInset={0} fill="var(--nx-markDeep)" stroke="none" content={<TeamCell {...node} />} {...scope.motion} isUpdateAnimationActive={scope.motion.isAnimationActive}
        onMouseEnter={(hit, event) => { const effort = hit.effort as Effort | undefined; if (effort) { event.stopPropagation(); scope.inspect(effort); } }} />
    </foreignObject>}
  </g>;
}

/** Two native treemap levels preserve the original asymmetric heading space and nested gaps. */
export function NestedTreemap({ data, height, width, animate = true, className = '', 'aria-label': label = 'Effort by area and team' }: NestedTreemapProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const [plotElement, setPlotElement] = useState<HTMLDivElement | null>(null);
  const [plotSize, setPlotSize] = useState({ width: 545, height: 260 });
  useLayoutEffect(() => {
    if (!plotElement) return;
    const measure = () => { const { width, height } = plotElement.getBoundingClientRect(); if (width > 0 && height > 0) setPlotSize(previous => previous.width === width && previous.height === height ? previous : { width, height }); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(plotElement);
    return () => observer.disconnect();
  }, [plotElement]);
  const [inspection, setInspection] = useState<{ data: readonly NestedTreemapDatum[]; effort: Effort } | null>(null);
  const layout = useMemo(() => {
    let valid = data.length > 0; const areas: Area[] = data.map((area, areaIndex): Area => {
      const teams: Effort[] = area.teams.map((team, teamIndex): Effort => {
        const available = typeof team.hours === 'number' && Number.isFinite(team.hours) && team.hours >= 0; if (!available) valid = false;
        return { id: `area-${areaIndex}-team-${teamIndex}`, name: team.name, hours: available ? team.hours! : 0, areaIndex, areaName: area.name, kind: 'team' };
      }).sort((a, b) => b.hours - a.hours);
      return { id: `area-${areaIndex}`, name: area.name, hours: teams.reduce((sum, team) => sum + team.hours, 0), areaIndex, areaName: area.name, kind: 'area', teams };
    }).sort((a, b) => b.hours - a.hours);
    const total = areas.reduce((sum, area) => sum + area.hours, 0); valid &&= Number.isFinite(total) && areas.some(area => area.teams.length > 0);
    return { valid, total, areas, observations: areas.flatMap((area): Effort[] => [area, ...area.teams]), data: areas.filter(area => area.hours > 0).map(effort => ({ name: effort.name, value: effort.hours, effort })) };
  }, [data]);
  const active = inspection?.data === data ? inspection.effort : null;
  const inspect = (effort: Effort) => setInspection({ data, effort });
  return <div ref={ref} className={`nx-nested-treemap relative flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] focus:not-focus-visible:outline-none focus-visible:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="nested-treemap" data-nx-animated={motion.isAnimationActive}
    tabIndex={0} role="group" aria-label={label} aria-describedby={`${id}-description`} onPointerLeave={() => setInspection(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInspection(null); }}
    onKeyDown={event => {
      if (!layout.valid || event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
      event.preventDefault(); if (event.key === 'Escape') { setInspection(null); return; }
      const previous = active ? layout.observations.findIndex(row => row.id === active.id) : -1;
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? layout.observations.length - 1 : previous < 0 ? 0 : Math.max(0, Math.min(layout.observations.length - 1, previous + (event.key === 'ArrowRight' ? 1 : -1)));
      inspect(layout.observations[index]!);
    }}>
    <span id={`${id}-description`} className="sr-only">Rectangle area shows supplied hours within each area. Parent headings show the area's share of total effort. Use left/right arrows to inspect areas and teams, Home/End for the limits and Escape to clear. The hierarchy remains expanded; zero hours add no rectangle.</span>
    {!layout.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete effort hierarchy available.</div> : layout.total === 0 ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]">No effort recorded · 0 hours</div> : <div className={`${height === undefined ? 'aspect-[640/340] min-h-[272px] w-full' : 'min-h-0 flex-1'} relative overflow-hidden bg-[var(--nx-paper)]`}>
      <div ref={setPlotElement} className="absolute -inset-x-[2.5px] -bottom-[2.5px] top-[29.5px]">
        <EffortScope value={{ active, inspect, total: layout.total, id, motion }}>
          <Treemap width={plotSize.width} height={plotSize.height} data={layout.data} aspectRatio={1.2} nodeGap={0} nodeInset={0} fill="var(--nx-paper)" stroke="none" content={node => <AreaCell {...node} />} {...motion} isUpdateAnimationActive={motion.isAnimationActive}
            onMouseEnter={(node, event) => { if (event.target instanceof Element && event.target.closest('foreignObject')) return; const effort = node.effort as Area | undefined; if (effort) { event.stopPropagation(); inspect(effort); } }} />
        </EffortScope>
      </div>
    </div>}
    {active && <div role="status" className="pointer-events-none absolute left-7 top-7 z-10 border-[length:var(--nx-stroke-mark)] border-[var(--nx-ink)] bg-[var(--nx-paper)] px-2.5 py-2 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-ink)]">{active.kind === 'area' ? active.name : `${active.areaName} / ${active.name}`}<br /><b>{active.hours} hours</b> · {layout.total ? (active.hours / layout.total * 100).toFixed(1) : '0.0'}%</div>}
  </div>;
}
