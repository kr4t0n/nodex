'use client';

import { useId, useMemo } from 'react';
import rough from 'roughjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { useSketchSettings, type SketchSettings } from '../../../../_shared/sketch/use-sketch-settings';

export type SketchBarTone = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i';

export interface SketchBarsDatum {
  /** Stable, unique identity controls both categorical color and the sketch seed. */
  id: string;
  label: string;
  /** Nonnegative magnitude. Null, negative and non-finite values are unavailable. */
  value: number | null;
  tone?: SketchBarTone;
}

export interface SketchBarsProps {
  data: readonly SketchBarsDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Point extends SketchBarsDatum { index: number; paint: string; seed: number }

const tones: Record<SketchBarTone, string> = {
  a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)',
  d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)',
  g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)',
};
const palette = Object.values(tones);
const generator = rough.generator();
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function seedFor(id: string): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return 1 + (hash >>> 0) % 2147483646;
}

function ValueLabel({ point, x, y, format }: { point: Point; x: number; y: number; format: (value: number) => string }) {
  return <text x={x} y={y - 12} textAnchor="middle" fill="var(--nx-ink)"
    fontFamily="var(--nx-font-heading)" fontSize="var(--nx-type-plotValue-size)" fontWeight="var(--nx-type-plotValue-weight)"
    data-nx-sketch-value={point.id}>{point.value === null ? '—' : format(point.value)}</text>;
}

/** Native bars own quantity and hit testing; only their fill texture is clipped. */
function SketchBar({ x, y, width, height, payload, settings, formatValue, prefix }: BarShapeProps & {
  settings: SketchSettings | null; formatValue: (value: number) => string; prefix: string;
}) {
  const point = payload as Point;
  const paths = useMemo(() => {
    if (!settings || !(width > 0 && height > 0)) return [];
    // Generate at the origin so a category's texture does not change when it moves.
    const drawable = generator.rectangle(0, 0, width, height, {
      ...settings, seed: point.seed, fill: point.paint, stroke: 'var(--nx-ink)', preserveVertices: true,
    });
    return drawable.sets.map((set) => ({ type: set.type, d: generator.opsToPath(set) }));
  }, [settings, width, height, point.seed, point.paint]);
  if (point.value === null) return null;
  const clip = `${prefix}-bar-${point.index}`;
  return <g>
    {point.value > 0 && height > 0 && <g transform={`translate(${x},${y})`} data-nx-sketch-bar={point.id}>
      <defs><clipPath id={clip}><rect width={width} height={height} /></clipPath></defs>
      <rect width={width} height={height} fill="transparent" data-nx-sketch-bounds={point.id} />
      <g pointerEvents="none" aria-hidden="true">
        {paths.length ? paths.map((path, index) => <path key={index} d={path.d} data-nx-sketch-part={path.type}
          clipPath={path.type === 'path' ? undefined : `url(#${clip})`}
          fill={path.type === 'fillPath' ? point.paint : 'none'}
          stroke={path.type === 'fillPath' ? 'none' : path.type === 'path' ? 'var(--nx-ink)' : point.paint}
          style={{ strokeWidth: path.type === 'path' ? 'var(--nx-stroke-mark)' : 'var(--nx-sketch-fillWeight)' }} />)
          : <rect width={width} height={height} fill={point.paint} stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-mark)' }} />}
      </g>
    </g>}
    <ValueLabel point={point} x={x + width / 2} y={y} format={formatValue} />
  </g>;
}

function Baseline({ settings }: { settings: SketchSettings | null }) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const zero = yScale?.(0);
  const paths = useMemo(() => {
    if (!plot || !settings || zero === undefined) return [];
    return generator.line(plot.x, zero, plot.x + plot.width, zero, {
      seed: 1, roughness: settings.axisRoughness, bowing: settings.bowing, preserveVertices: true,
    }).sets.map((set) => generator.opsToPath(set));
  }, [plot, zero, settings]);
  return <g aria-hidden="true">{paths.map((d, index) => <path key={index} d={d} fill="none" stroke="var(--nx-ink)"
    style={{ strokeWidth: 'var(--nx-stroke-axis)' }} />)}</g>;
}

function UnavailableLabels({ points, format }: { points: readonly Point[]; format: (value: number) => string }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const zero = yScale?.(0);
  if (!xScale || zero === undefined) return null;
  return <g>{points.filter((point) => point.value === null).map((point) => {
    const x = xScale(point.index, { position: 'middle' });
    return x === undefined ? null : <ValueLabel key={point.id} point={point} x={x} y={zero} format={format} />;
  })}</g>;
}

/** roughViz-derived marks in a native Recharts composition, with caller-owned data. */
export function SketchBars({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className = '', 'aria-label': label = 'Values by category' }: SketchBarsProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const settings = useSketchSettings(ref);
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
      const seed = seedFor(datum.id);
      return { ...datum, value, index, seed, paint: (datum.tone && tones[datum.tone]) || palette[seed % palette.length]! };
    });
    return { points, maximum, validIds };
  }, [data]);
  const status = !points.length ? 'No categories to compare.' : !validIds ? 'Each category needs a unique, nonempty ID.'
    : !points.some((point) => point.value !== null) ? 'No observations available.' : null;

  return <div ref={ref} className={`flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="sketch-bars" data-nx-animated={motion.isAnimationActive}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] text-[var(--nx-muted)]">
      <span>{unitLabel}</span>{contextLabel && <span>{contextLabel}</span>}
    </div>
    {status ? <div className="flex min-h-[200px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]" role="status">{status}</div> :
      <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto overflow-y-hidden ${height === undefined ? 'aspect-[640/320] min-h-[280px] w-full' : 'min-h-0 flex-1'}`}>
        <div className="h-full overflow-hidden" style={{ minWidth: Math.max(300, points.length * 96) }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}>
            <BarChart data={points} accessibilityLayer title={label}
              desc={`Column height compares ${unitLabel} from zero. Color identifies categories. A dash means unavailable. Use left and right arrow keys to inspect every category.`}
              margin={{ top: 36, right: 12, bottom: 8, left: 0 }} barCategoryGap="24%" maxBarSize={100}
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-axis)" />
              <XAxis dataKey="index" type="category" scale="band" interval={0} height={36} tickMargin={12}
                axisLine={false} tickLine={false} tickFormatter={(index: number) => points[index]?.label ?? ''}
                tick={{ fill: 'var(--nx-ink)', fontFamily: 'var(--nx-font-heading)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
              <YAxis type="number" domain={[0, maximum || 1]} tickCount={4} width={42} axisLine={false} tickLine={false}
                tickFormatter={(value: number) => compact.format(value)}
                tick={{ fill: 'var(--nx-muted)', fontFamily: 'var(--nx-font-heading)', fontSize: 'var(--nx-type-axis-size)' }} />
              <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
                const point = typeof index === 'number' ? points[index] : undefined;
                return active && point ? <div role="status" className="max-w-[240px] rounded-[var(--nx-radius-tooltip)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] bg-[var(--nx-surfaceFill)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)]">
                  <div className="font-[number:var(--nx-font-weight-semibold)]">{point.label}</div>
                  <div>{point.value === null ? 'Unavailable' : `${valueFormatter(point.value)} ${unitLabel}`}</div>
                </div> : null;
              }} />
              <Bar id={`${id}-categories`} dataKey="value" name={unitLabel} fill="var(--nx-ink)" stroke="none" activeBar={false}
                shape={(props: BarShapeProps) => <SketchBar {...props} settings={settings} formatValue={valueFormatter} prefix={id} />} {...motion} />
              <Baseline settings={settings} />
              <UnavailableLabels points={points} format={valueFormatter} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
  </div>;
}
