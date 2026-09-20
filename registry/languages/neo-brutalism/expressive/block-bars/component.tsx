'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { neoCategoryTone, type NeoCategoryTone } from '../../../../_shared/neo-categorical';

export type BlockBarTone = NeoCategoryTone;

export interface BlockBarsDatum {
  /** Stable, unique category identity. Display labels may repeat. */
  id: string;
  label: string;
  /** Nonnegative magnitude; null and invalid numbers are unavailable. */
  value: number | null;
  /** Categorical role, independent of magnitude. Defaults to a stable ID hash. */
  tone?: BlockBarTone;
}

export interface BlockBarsProps {
  data: readonly BlockBarsDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Point extends BlockBarsDatum {
  index: number;
  fill: string;
}

const tones: Record<NeoCategoryTone, string> = {
  a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)',
};
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);

/** Only the front face encodes magnitude; the hard shadow is a CSS effect. */
function Block({ x, y, width, height, payload, formatValue }: BarShapeProps & { formatValue: (value: number) => string }) {
  const point = payload as Point;
  if (point.value === null) return null;
  return <g>
    {point.value > 0 && height > 0 && <Rectangle x={x} y={y} width={width} height={height} radius={0}
      fill={point.fill} stroke="var(--nx-ink)"
      style={{ strokeWidth: 'var(--nx-stroke-mark)', filter: 'drop-shadow(var(--nx-shadow-surface) var(--nx-ink))' }}
      data-nx-block={point.id} data-nx-value={point.value} />}
    {/* Keep labels with the native mark, including when drawing is interrupted. */}
    <ValueText point={point} x={x + width / 2} y={y} format={formatValue} />
  </g>;
}

function ValueText({ point, x, y, format }: { point: Point; x: number; y: number; format: (value: number) => string }) {
  return <text x={x} y={y - 14} textAnchor="middle"
    fill="var(--nx-ink)" fontFamily="var(--nx-font-sans)" fontSize="var(--nx-type-plotValue-size)"
    fontWeight="var(--nx-type-plotValue-weight)" data-nx-block-value={point.id}>
    {point.value === null ? '—' : format(point.value)}
  </text>;
}

/** Recharts omits null bars; position their dashes with its public scales. */
function UnavailableLabels({ points, format }: { points: readonly Point[]; format: (value: number) => string }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const baseline = yScale?.(0);
  if (!xScale || baseline === undefined) return null;
  return <g>{points.filter((point) => point.value === null).map((point) => {
    const x = xScale(point.index, { position: 'middle' });
    return x === undefined ? null : <ValueText key={point.id} point={point} x={x} y={baseline} format={format} />;
  })}</g>;
}

/** A zero-based categorical comparison. Front-face height, never hue, encodes value. */
export function BlockBars({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className = '', 'aria-label': label = 'Values by category' }: BlockBarsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, maximum, validIds } = useMemo(() => {
    const ids = new Set<string>();
    let validIds = true;
    let maximum = 0;
    const points = data.map((datum, index): Point => {
      if (!datum.id.trim() || ids.has(datum.id)) validIds = false;
      ids.add(datum.id);
      const value = datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 ? datum.value : null;
      maximum = Math.max(maximum, value ?? 0);
      return { ...datum, index, value, fill: tones[neoCategoryTone(datum.id, datum.tone)] };
    });
    return { points, maximum, validIds };
  }, [data]);
  const status = !points.length ? 'No categories to compare.'
    : !validIds ? 'Each category needs a unique, nonempty ID.'
    : !points.some((point) => point.value !== null) ? 'No observations available.' : null;

  return <div ref={ref}
    className={`flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="block-bars" data-nx-animated={motion.isAnimationActive}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] pb-3 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] tracking-[var(--nx-type-label-tracking)] uppercase">
      <span>{unitLabel}</span>
      {contextLabel && <span className="text-[var(--nx-muted)]">{contextLabel}</span>}
    </div>
    {status ? <div className="flex min-h-[200px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]" role="status">{status}</div> :
      <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto ${height === undefined ? 'aspect-[560/320] min-h-[280px] w-full' : 'min-h-0 flex-1'}`}>
        <div className="h-full" style={{ minWidth: points.length > 6 ? points.length * 76 : undefined }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 340 }}>
            <BarChart data={points} accessibilityLayer title={label}
              desc={`Column height compares ${unitLabel} from zero. Colors identify categories, not value ranks. A dash means unavailable. Use the left and right arrow keys to inspect each category.`}
              margin={{ top: 38, right: 16, bottom: 8, left: 0 }} barCategoryGap="22%" maxBarSize={120}
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
              <XAxis dataKey="index" type="category" scale="band" interval={0} height={36} tickSize={0} tickMargin={16}
                axisLine={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)' }} tickLine={false}
                tickFormatter={(index: number) => points[index]?.label ?? ''}
                tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-font-weight-bold)' }} />
              <YAxis type="number" domain={[0, maximum || 1]} tickCount={4} width={42} axisLine={false} tickLine={false}
                tickFormatter={(value: number) => compact.format(value)}
                tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
              <Tooltip filterNull={false} cursor={false} isAnimationActive={false}
                content={({ active, label: index }) => {
                  const point = typeof index === 'number' ? points[index] : undefined;
                  return active && point ? <div role="status"
                    className="max-w-[240px] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-bg)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)] [box-shadow:var(--nx-shadow-popover)_var(--nx-ink)]">
                    <div className="font-[number:var(--nx-font-weight-bold)]">{point.label}</div>
                    <div>{point.value === null ? 'Unavailable' : `${valueFormatter(point.value)} ${unitLabel}`}</div>
                  </div> : null;
                }} />
              <Bar id={`${id}-categories`} dataKey="value" name={unitLabel} fill="var(--nx-ink)" stroke="none"
                shape={(props: BarShapeProps) => <Block {...props} formatValue={valueFormatter} />} activeBar={false} {...motion} />
              <UnavailableLabels points={points} format={valueFormatter} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
  </div>;
}
