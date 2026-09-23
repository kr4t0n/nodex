'use client';

import { useId, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { studioTone, type StudioTone } from '../../../../_shared/studio-categorical';
import { StudioChartFrame, StudioChartKey, StudioChartTooltip } from '../../../../_shared/studio-chart-frame';

export interface SoftLineSeries { id: string; label: string; tone?: StudioTone }
export interface SoftLineDatum {
  id: string; label: string;
  /** Finite, strictly increasing numeric coordinate. */
  x: number;
  /** Signed readings keyed by series ID; unavailable readings break that series. */
  values: Readonly<Record<string, number | null>>;
}
export interface SoftLineProps {
  data: readonly SoftLineDatum[]; series: readonly SoftLineSeries[];
  unitLabel?: string; contextLabel?: string; valueFormatter?: (value: number) => string;
  width?: number; height?: number; animate?: boolean; className?: string; 'aria-label'?: string;
}
interface Row { id: string; label: string; x: number; values: (number | null)[] }
const tones: Record<StudioTone, string> = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)' };
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => numbers.format(value);

function Observation({ props, index, seriesId, paint }: { props: unknown; index: number; seriesId: string; paint: string }) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Row };
  if (!payload || payload.values[index] === null || cx === undefined || cy === undefined || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
  return <circle cx={cx} cy={cy} r={4} fill="var(--nx-surfaceFill)" stroke={paint} strokeWidth="var(--nx-stroke-mark)"
    data-nx-soft-line-point={payload.id} data-nx-series={seriesId} />;
}

/** Independent monotone curves share numeric scales; a missing reading never bridges a gap. */
export function SoftLine({ data, series, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className, 'aria-label': label = 'Series over time' }: SoftLineProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { rows, keys, minimum, maximum, validIds, validX } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    const rows: Row[] = data.map(datum => ({ id: datum.id, label: datum.label, x: datum.x, values: series.map(item => {
      const value = datum.values[item.id]; return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }) }));
    const values = rows.flatMap(row => row.values.filter(value => value !== null));
    return { rows, keys: series.map(item => ({ ...item, paint: tones[studioTone(item.id, item.tone)] })),
      minimum: Math.min(0, ...values), maximum: Math.max(0, ...values), validIds: unique(data) && unique(series),
      validX: rows.every((row, index) => Number.isFinite(row.x) && (index === 0 || row.x > rows[index - 1]!.x)) };
  }, [data, series]);
  const status = !validIds ? 'Observations and series each need unique, nonempty IDs.'
    : !validX ? 'X coordinates must be finite and strictly increasing.' : !series.length ? 'No series to compare.'
    : !rows.some(row => row.values.some(value => value !== null)) ? 'No observations available.' : null;

  return <StudioChartFrame ref={ref} name="soft-line" heading={unitLabel} contextLabel={contextLabel}
    width={width} height={height} animated={motion.isAnimationActive} status={status} className={className}>
    <StudioChartKey items={keys} />
    <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto overflow-y-hidden ${height === undefined ? 'h-[260px]' : 'min-h-0 flex-1'}`}>
      <div className="h-full overflow-hidden" style={{ minWidth: Math.max(280, rows.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 260 }}>
          <LineChart data={rows} accessibilityLayer title={label}
            desc={`Height shows ${unitLabel}. Horizontal distance follows numeric X coordinates. Missing readings break each series independently. Use left and right arrow keys to inspect observations.`}
            margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
            className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
            <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} ticks={rows.map(row => row.x)} minTickGap={24}
              height={34} tickMargin={12} axisLine={false} tickLine={false} padding={{ left: 6, right: 6 }}
              tickFormatter={(x: number) => rows.find(row => row.x === x)?.label ?? ''}
              tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
            <YAxis domain={[minimum, maximum || (minimum === 0 ? 1 : 0)]} width={42} tickCount={4} axisLine={false} tickLine={false}
              tickFormatter={(value: number) => compact.format(value)} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
            <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-muted)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '3 4' }}
              content={({ active, label: x }) => {
                const row = rows.find(row => row.x === x);
                return active && row ? <StudioChartTooltip title={row.label}>{keys.map((item, index) => <div key={item.id}>
                  {item.label}: {row.values[index] === null ? 'Unavailable' : `${valueFormatter(row.values[index]!)} ${unitLabel}`}
                </div>)}</StudioChartTooltip> : null;
              }} />
            {keys.map((item, index) => <Line key={item.id} id={`${id}-${index}`} dataKey={(row: Row) => row.values[index] ?? null}
              name={item.label} type="monotoneX" connectNulls={false} fill="none" stroke={item.paint} strokeWidth="var(--nx-stroke-mark)" activeDot={false}
              dot={(props: unknown) => <Observation props={props} index={index} seriesId={item.id} paint={item.paint} />} {...motion} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </StudioChartFrame>;
}
