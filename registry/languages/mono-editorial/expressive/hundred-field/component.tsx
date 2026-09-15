'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface HundredFieldDatum { name: string; percent: number | null }
export interface HundredFieldProps {
  data: readonly HundredFieldDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface Person { x: number; y: number; unit: number }
interface SegmentPoint { name: string; percent: number | null; index: number; x: number; y: number; people: Person[]; labelY: number }
const cores: readonly (readonly [number, number])[] = [[-72, 26], [72, 50], [-18, -86], [118, -72]];
const ties: readonly (readonly [number, number])[] = [[0, 1], [0, 2], [1, 3], [2, 3]];
const tones = ['var(--nx-ink)', 'var(--nx-markDeep)', 'var(--nx-muted)', 'var(--nx-markQuiet)'];
const texture = (unit: number, seed: number) => Math.abs(((unit * 73856093) ^ (seed * 19349663)) % 1000) / 1000;

function ShareMark(props: unknown) {
  const { payload } = props as { payload?: SegmentPoint };
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!payload || !xScale || !yScale) return <g />;
  return <g data-nx-observation={payload.index} opacity={0.8}>
    {payload.people.map((person) => <circle key={person.unit} data-nx-person={payload.index} cx={xScale(person.x)} cy={yScale(person.y)} r={2.2} fill={tones[payload.index]} />)}
    <text data-nx-share={payload.index} x={xScale(payload.x)} y={(yScale(payload.labelY) ?? 0) + 5} dy="0.5em" textAnchor="middle" dominantBaseline="central"
      fill="var(--nx-markMuted)" fontSize="calc(var(--nx-type-plotValue-size) * 7.5 / 17)" fontWeight="var(--nx-type-cardTitle-weight)">{payload.name} {payload.percent ?? '—'}</text>
  </g>;
}

function SurveyGuides({ segments }: { segments: readonly SegmentPoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  const point = (value: { x: number; y: number }) => ({ x: xScale(value.x) ?? 0, y: yScale(value.y) ?? 0 });
  return <g pointerEvents="none" aria-hidden="true">
    {ties.map(([a, b]) => {
      const from = segments[a]; const to = segments[b];
      return from && to ? <Curve key={`${a}:${b}`} data-nx-tie={`${a}:${b}`} points={[point(from), point(to)]} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="2 5" /> : null;
    })}
    {segments.flatMap((segment) => segment.people.filter((person) => person.unit % 5 === 0).map((person) => <Curve key={`${segment.index}:${person.unit}`} data-nx-spoke={segment.index} points={[point(segment), point(person)]} type="linear" fill="none" stroke="var(--nx-grid)" strokeWidth="calc(var(--nx-stroke-hairline) * 5 / 7)" />))}
  </g>;
}

/** Each real segment is one inspectable observation; its share determines an exact dot count. */
export function HundredField({ data, height, width, animate = true, className = '', 'aria-label': label = 'Disposition shares in a hundred people' }: HundredFieldProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const segments = useMemo(() => data.slice(0, cores.length).map((segment, index): SegmentPoint => {
    const [x, y] = cores[index]!;
    const percent = segment.percent !== null && Number.isSafeInteger(segment.percent) && segment.percent >= 0 && segment.percent <= 100 ? segment.percent : null;
    const people = Array.from({ length: percent ?? 0 }, (_, unit) => {
      const radius = 4 + Math.sqrt(unit) * 5.9 + texture(unit + 1, index + 2) * 3;
      const angle = (unit * 137.508 + index * 55) * Math.PI / 180;
      return { x: x + radius * Math.cos(angle), y: y + radius * Math.sin(angle), unit };
    });
    const labelY = y - Math.max(46, ...people.map((person) => y - person.y + 6));
    return { name: segment.name, percent, index, x, y, people, labelY };
  }), [data]);
  const available = data.length <= cores.length && segments.some((segment) => segment.percent !== null) && segments.reduce((total, segment) => total + (segment.percent ?? 0), 0) <= 100;
  const floor = Math.min(-150, ...segments.map((segment) => segment.labelY - 12));
  return <div ref={ref} className={`nx-hundred-field flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="hundred-field" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No share observations available.</div> : <div className={height === undefined ? 'relative aspect-[560/340] min-h-[272px] w-full' : 'relative min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each dot is one person in a hundred. Cluster size shows the supplied whole-percent share. Missing or unallocated shares add no people. Use the left and right arrow keys to inspect dispositions."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
          <XAxis dataKey="x" type="number" hide domain={[-180, 210]} />
          <YAxis dataKey="y" type="number" hide domain={[floor, 130]} />
          <SurveyGuides segments={segments} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const segment = payload?.[0]?.payload as SegmentPoint | undefined;
            return active && segment ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{segment.name} — {segment.percent === null ? 'Unavailable' : `${segment.percent} people in a hundred`}</div> : null;
          }} />
          <Scatter id={`${id}-shares`} data={segments} name="Disposition shares" fill="var(--nx-ink)" shape={ShareMark} activeShape={ShareMark} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">ONE DOT = ONE PERSON IN A HUNDRED · SPOKE MARKS EVERY FIFTH</div>
    </div>}
  </div>;
}
