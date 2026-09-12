'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps, type LabelProps } from 'recharts';
import { RungMarks, rungCount } from '../../../../_shared/rung-marks';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface StackedRungsDatum {
  region: string;
  /** Whole thousands of dollars; an unavailable segment makes the stack unavailable. */
  coreK: number | null;
  addOnsK: number | null;
  servicesK: number | null;
}

export interface StackedRungsProps {
  data: readonly StackedRungsDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface RegionPoint extends StackedRungsDatum {
  index: number;
  total: number | null;
}

const segments = [
  { key: 'coreK', name: 'core', fill: 'var(--nx-ink)', label: 'var(--nx-ink)' },
  { key: 'addOnsK', name: 'add-ons', fill: 'var(--nx-muted)', label: 'var(--nx-muted)' },
  { key: 'servicesK', name: 'services', fill: 'var(--nx-markPale)', label: 'var(--nx-muted)' },
] as const;

function RegionRungs({ segment, ...props }: BarShapeProps & { segment: number }) {
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const point = props.payload as RegionPoint;
  const role = segments[segment];
  if (!yScale || !xScale || !role || point.total === null) return null;
  const count = point[role.key];
  const x = xScale(point.index, { position: 'middle' });
  const floor = yScale(0);
  const next = yScale(1);
  if (count === null || x === undefined || floor === undefined || next === undefined) return null;
  // Recharts stacks the actual counts. Shift the custom marks one scale unit per
  // earlier segment to preserve the specimen's gaps without adding fake revenue.
  const step = count ? props.height / count : floor - next;
  const bottom = props.y + props.height - segment * step;
  return <g>
    <RungMarks x={x} bottom={bottom} step={step} count={count} width={[23, 5]} widthSeed={point.index * 3 + segment + 2}
      opacity={[0.6, 0.4]} opacitySeed={point.index + segment + 4} fill={role.fill} observation={point.index} series={role.name} />
    {!props.isAnimating && <text data-nx-segment-label={role.name} data-nx-observation={point.index} x={x + 14} y={bottom - (count / 2 + 1) * step}
      dominantBaseline="central" fill={role.label} opacity={0.8} fontSize="var(--nx-type-axis-size)" fontWeight="calc(var(--nx-type-plotValue-weight) * 8 / 7)" pointerEvents="none">{count}</text>}
  </g>;
}

function CoreRungs(props: BarShapeProps) { return <RegionRungs {...props} segment={0} />; }
function AddOnRungs(props: BarShapeProps) { return <RegionRungs {...props} segment={1} />; }
function ServiceRungs(props: BarShapeProps) { return <RegionRungs {...props} segment={2} />; }

function RegionTotal({ value, observations }: LabelProps & { observations: readonly RegionPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const point = typeof value === 'number' ? observations[value] : undefined;
  const x = xScale?.(value, { position: 'middle' });
  const y = yScale?.((point?.total ?? 0) + 5);
  return point && x !== undefined && y !== undefined ? <text data-nx-total={value} x={x} y={y - 5} dy="-0.5em" textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" opacity={0.8}
    fontSize="calc(var(--nx-type-plotValue-size) * 10.5 / 17)" fontWeight="calc(var(--nx-type-plotValue-weight) * 8 / 7)" pointerEvents="none">{point.total ?? '—'}</text> : <g />;
}

/** Three revenue segments share each region's stack, separated by an empty rung. */
export function StackedRungs({ data, height, width, animate = true, className = '', 'aria-label': label = 'Revenue by region and product' }: StackedRungsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const points = useMemo(() => data.map((point, index): RegionPoint => {
    const coreK = rungCount(point.coreK);
    const addOnsK = rungCount(point.addOnsK);
    const servicesK = rungCount(point.servicesK);
    const total = coreK !== null && addOnsK !== null && servicesK !== null ? coreK + addOnsK + servicesK : null;
    // An incomplete total cannot position later segments truthfully. Keep its
    // category, with an unavailable stack, rather than letting null stack as zero.
    return { region: point.region, index, total, coreK: total === null ? null : coreK, addOnsK: total === null ? null : addOnsK, servicesK: total === null ? null : servicesK };
  }), [data]);
  const available = points.some((point) => point.total !== null);
  const ceiling = Math.max(0, ...points.map((point) => point.total ?? 0)) + 8;
  return <div ref={ref} className={`nx-stacked-rungs flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="stacked-rungs" data-nx-animated={motion.isAnimationActive}>
    {!available ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No complete revenue observations available.</div> : <div className={`relative ${height === undefined ? 'aspect-[560/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 328 }}>
        <BarChart data={points} accessibilityLayer title={label} desc="Each rung is one thousand dollars. Core, add-ons and services stack from darkest to palest, separated by an empty rung. Use the left and right arrow keys to inspect regions."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 34, right: 40, bottom: 0, left: 40 }}>
          <XAxis dataKey="index" type="category" height={52} interval={0} tickLine={false} tickSize={0} tickMargin={12}
            tickFormatter={(index: number) => points[index]?.region ?? ''} axisLine={{ stroke: 'var(--nx-grid)', strokeWidth: 'calc(var(--nx-stroke-hairline) * 8 / 7)' }}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'calc(var(--nx-type-axis-size) * 7.5 / 8)', fontWeight: 'calc(var(--nx-type-axis-weight) * 7 / 6)', fontFamily: 'var(--nx-font-sans)' }} />
          <YAxis type="number" hide domain={[0, ceiling]} />
          <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? points[index] : undefined;
            return active && point ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">
              {point.region} — {point.total === null ? 'Unavailable' : `$${point.total}k across 3 lines`}
            </div> : null;
          }} />
          <Bar id={`${id}-core`} dataKey="coreK" name="Core" stackId="revenue" fill="var(--nx-ink)" stroke="none" shape={CoreRungs} activeBar={false} {...motion} />
          <Bar id={`${id}-add-ons`} dataKey="addOnsK" name="Add-ons" stackId="revenue" fill="var(--nx-muted)" stroke="none" shape={AddOnRungs} activeBar={false} {...motion} />
          <Bar id={`${id}-services`} dataKey="servicesK" name="Services" stackId="revenue" fill="var(--nx-markPale)" stroke="none" shape={ServiceRungs} activeBar={false} {...motion}>
            <LabelList dataKey="index" content={<RegionTotal observations={points} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[length:calc(var(--nx-type-legend-size)*7/9)] font-[number:var(--nx-type-legend-weight)] leading-none text-[var(--nx-markQuiet)]">DARKEST = CORE · MID = ADD-ONS · PALE = SERVICES · ONE RUNG = $1K</div>
    </div>}
  </div>;
}
