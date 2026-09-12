'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieLabelRenderProps, type PieSectorShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface PetalRoseDatum {
  name: string;
  /** Times this category was named. Null means unavailable; zero is measured. */
  count: number | null;
}

export interface PetalRoseProps {
  data: readonly PetalRoseDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface PetalPoint extends PetalRoseDatum {
  index: number;
  weight: number;
  share: number;
  fill: string;
}

/** Recharts supplies the angles and radii; each observation owns its track and petal. */
function Petal(props: PieSectorShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = props;
  const point = props.payload as PetalPoint;
  const trackRadius = innerRadius * 92 / 14;
  const geometry = { cx, cy, innerRadius, startAngle, endAngle };

  return <g data-nx-petal={point.index}>
    <Sector {...geometry} outerRadius={trackRadius} cornerRadius={16} className="nx-petal-track"
      fill="var(--nx-plotTrack)" stroke="var(--nx-bg)" strokeWidth={5} />
    {point.count !== null && point.count > 0 && <Sector {...geometry} outerRadius={outerRadius} cornerRadius={14} className="nx-petal-mark"
      fill={point.fill} stroke="var(--nx-bg)" strokeWidth={5} />}
  </g>;
}

/** The Pie label layer keeps every label above every track and petal. */
function PetalLabel(props: PieLabelRenderProps) {
  const { cx, cy, innerRadius, startAngle, endAngle } = props;
  const point = props.payload as PetalPoint;
  const labelRadius = (innerRadius + innerRadius * 92 / 14) / 2 + 3;
  const angle = -((startAngle + endAngle) / 2) * Math.PI / 180;
  const x = cx + labelRadius * Math.cos(angle);
  const y = cy + labelRadius * Math.sin(angle);
  // The original specimen knocks labels out at 8 of 12; retain that relative reach.
  const knockout = point.share >= 2 / 3;
  return <g pointerEvents="none" textAnchor="middle" dominantBaseline="central" fontFamily="var(--nx-font-sans)">
    <text x={x} y={y - 5} data-nx-count={point.index} fill={knockout ? 'var(--nx-paper)' : 'var(--nx-ink)'}
      fontSize="var(--nx-type-plotValue-size)" fontWeight="var(--nx-type-plotValue-weight)">{point.count === null ? '—' : point.count}</text>
    <text x={x} y={y + 10} data-nx-label={point.index} fill={knockout ? 'var(--nx-faint)' : 'var(--nx-muted)'}
      fontSize="var(--nx-type-caption-size)">{point.name}</text>
  </g>;
}

/** Equal-angle petals compare counts through their radius and monochrome tone. */
export function PetalRose({ data, height, width, animate = true, className = '', 'aria-label': label = 'Counts by category' }: PetalRoseProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => {
    const counts = data.map((point) => point.count !== null && Number.isFinite(point.count) && point.count >= 0 ? point.count : null);
    const max = Math.max(0, ...counts.flatMap((count) => count === null ? [] : [count]));
    return data.map((point, index): PetalPoint => {
      const count = counts[index] ?? null;
      const share = count !== null && max > 0 ? count / max : 0;
      const fill = share > 0.8 ? 'var(--nx-ink)' : share > 0.6 ? 'var(--nx-markStrong)' : share > 0.35 ? 'var(--nx-muted)' : 'var(--nx-faint)';
      return { name: point.name, count, index, weight: 1, share, fill };
    });
  }, [data]);
  const available = points.some((point) => point.count !== null);

  return <div ref={ref} className={`nx-petal-rose flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="petal-rose" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : (
      <div className={height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
          <PieChart accessibilityLayer title={label} desc="Each category has an equal angle. Petal length and tone compare counts with the largest count. Use the left and right arrow keys to inspect categories."
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
              const point = payload?.[0]?.payload as PetalPoint | undefined;
              return active && point ? <div role="status" className="bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
                {point.name} — {point.count === null ? 'Unavailable' : `named ${point.count} times`}
              </div> : null;
            }} />
            <Pie id={`${id}-petals`} data={points} dataKey="weight" nameKey="name" cx="50%" cy="50%" startAngle={90} endAngle={-270}
              innerRadius="14%" outerRadius={(point: PetalPoint) => `${14 + 74 * point.share}%`} shape={Petal} label={PetalLabel} labelLine={false} rootTabIndex={-1}
              fill="var(--nx-ink)" stroke="none" animationBegin={0} {...motion} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>;
}
