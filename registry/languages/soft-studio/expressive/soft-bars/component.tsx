'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { studioTone, type StudioTone } from '../../../../_shared/studio-categorical';
import { StudioChartFrame, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftBarsDatum {
  id: string; label: string; value: number | null; tone?: StudioTone;
}

export interface SoftBarsProps {
  data: readonly SoftBarsDatum[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}

interface Point extends SoftBarsDatum { index: number; fill: string }
const tones: Record<StudioTone, string> = {
  a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)',
};
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function SoftBar({ x, y, width, height, payload }: BarShapeProps) {
  const point = payload as Point;
  if (point.value === null || point.value === 0 || width <= 0 || height <= 0) return <g />;
  // CSS rounding is bounded by the native rectangle; it never extends the measured height.
  return <rect x={x} y={y} width={width} height={height} fill={point.fill}
    style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }}
    data-nx-soft-bar={point.id} data-nx-value={point.value} />;
}

function Readings({ points, format }: { points: readonly Point[]; format: (value: number) => string }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return <g>{points.map(point => {
    const x = xScale(point.index, { position: 'middle' }); const y = yScale(point.value ?? 0);
    return x === undefined || y === undefined ? null : <text key={point.id} x={x} y={y - 12} textAnchor="middle"
      data-nx-soft-reading={point.id} fill="var(--nx-ink)" fontFamily="var(--nx-font-sans)"
      fontSize="var(--nx-type-plotValue-size)" fontWeight="var(--nx-type-plotValue-weight)">
      {point.value === null ? '—' : format(point.value)}
    </text>;
  })}</g>;
}

/** Rounded native bars retain caller order, identity colors and a common zero baseline. */
export function SoftBars({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Values by category' }: SoftBarsProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { points, maximum, valid } = useMemo(() => {
    const ids = new Set<string>(); let valid = true; let maximum = 0;
    const points = data.map((datum, index): Point => {
      if (!datum.id.trim() || ids.has(datum.id)) valid = false;
      ids.add(datum.id);
      const value = datum.value !== null && Number.isFinite(datum.value) && datum.value >= 0 ? datum.value : null;
      maximum = Math.max(maximum, value ?? 0);
      return { ...datum, index, value, fill: tones[studioTone(datum.id, datum.tone)] };
    });
    return { points, maximum, valid };
  }, [data]);
  const status = !valid ? 'Each category needs a unique, nonempty ID.'
    : !points.some(point => point.value !== null) ? 'No observations available.' : null;

  return <StudioChartFrame ref={ref} name="soft-bars" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto overflow-y-hidden ${height === undefined ? 'h-[280px]' : 'min-h-0 flex-1'}`}>
      <div className="h-full overflow-hidden" style={{ minWidth: Math.max(280, points.length * 76) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
          <BarChart data={points} accessibilityLayer title={label}
            desc={`Bar height shows ${unitLabel} from zero. Color identifies categories. Zero has a label without a bar; a dash means unavailable. Use left and right arrow keys to inspect categories.`}
            margin={{ top: 30, right: 8, bottom: 0, left: 0 }} barCategoryGap="26%" maxBarSize={64}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
            <XAxis dataKey="index" type="category" scale="band" interval={0} height={34} tickMargin={12} axisLine={false} tickLine={false}
              tickFormatter={(index: number) => points[index]?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <YAxis domain={[0, maximum || 1]} width={42} tickCount={4} axisLine={false} tickLine={false}
              tickFormatter={(value: number) => compact.format(value)} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <Tooltip filterNull={false} cursor={false} isAnimationActive={false} content={({ active, label: index }) => {
              const point = typeof index === 'number' ? points[index] : undefined;
              return active && point ? <StudioChartTooltip title={point.label}>{point.value === null ? 'Unavailable' : `${valueFormatter(point.value)} ${unitLabel}`}</StudioChartTooltip> : null;
            }} />
            <Bar id={`${id}-bars`} dataKey="value" name={unitLabel} fill="var(--nx-seriesA)" stroke="none" activeBar={false} shape={SoftBar} {...motion} />
            <Readings points={points} format={valueFormatter} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </StudioChartFrame>;
}
