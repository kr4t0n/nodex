'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface PunchAreaDatum {
  /** Stable identity. Observations retain caller order and equal horizontal spacing. */
  id: string;
  label: string;
  /** Nonnegative value; null and invalid values leave a gap. */
  value: number | null;
}

export interface PunchAreaProps {
  data: readonly PunchAreaDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Point extends PunchAreaDatum { index: number; last: boolean }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = (value: number) => number.format(value);

function SquarePoint(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Point };
  if (cx === undefined || cy === undefined || !payload || payload.value === null) return <g />;
  const size = payload.last ? 14 : 10;
  return <rect data-nx-area-point={payload.id} data-nx-value={payload.value}
    x={cx - size / 2} y={cy - size / 2} width={size} height={size}
    fill={payload.last ? 'var(--nx-seriesD)' : 'var(--nx-seriesA)'} stroke="var(--nx-ink)"
    style={{ strokeWidth: 'var(--nx-stroke-hairline)', filter: 'drop-shadow(var(--nx-shadow-badge) var(--nx-ink))' }} />;
}

/** Linear interpolation between ordered observations; missing readings break both line and fill. */
export function PunchArea({ data, unitLabel = 'Value', contextLabel, valueFormatter = formatNumber,
  width, height, animate = true, className = '', 'aria-label': label = 'Values over time' }: PunchAreaProps) {
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
      return { ...datum, value, index, last: index === data.length - 1 };
    });
    return { points, maximum, validIds };
  }, [data]);
  const last = points.at(-1);
  const status = !points.length ? 'No observations available.'
    : !validIds ? 'Each observation needs a unique, nonempty ID.'
    : !points.some(point => point.value !== null) ? 'No observations available.' : null;

  return <div ref={ref} className={`flex min-w-0 flex-col bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="punch-area" data-nx-animated={motion.isAnimationActive}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] tracking-[var(--nx-type-label-tracking)] uppercase">{unitLabel}</div>
        <div data-nx-area-latest className="mt-2 break-words text-[length:var(--nx-type-stat-largeSize)] leading-[var(--nx-type-stat-lineHeight)] font-[number:var(--nx-font-weight-bold)] tracking-[var(--nx-type-stat-largeTracking)]">
          {status || !last || last.value === null ? '—' : valueFormatter(last.value)}
        </div>
        {last && <div className="mt-2 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{last.label}{last.value === null ? ' · unavailable' : ''}</div>}
      </div>
      {contextLabel && <span className="max-w-full border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-seriesB)] px-3 py-2 text-[length:var(--nx-type-label-size)] font-[number:var(--nx-type-label-weight)] uppercase [box-shadow:var(--nx-shadow-badge)_var(--nx-ink)]">{contextLabel}</span>}
    </div>
    {status ? <div role="status" className="flex min-h-[240px] flex-1 items-center text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">{status}</div> :
      <div className={`mt-[var(--nx-space-cardBodyGap)] overflow-x-auto ${height === undefined ? 'aspect-[600/280] min-h-[240px] w-full' : 'min-h-[180px] flex-1'}`}>
        <div className="h-full" style={{ minWidth: points.length > 10 ? points.length * 48 : undefined }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
            <AreaChart data={points} accessibilityLayer title={label}
              desc={`Height shows ${unitLabel} from zero. Observations are equally spaced in caller order. Missing readings leave gaps. The headline is the final supplied reading, even when unavailable. Use left and right arrow keys to inspect observations.`}
              margin={{ top: 18, right: 16, bottom: 4, left: 0 }}
              className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-hairline)_solid_var(--nx-ink)]">
              <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="4 5" />
              <XAxis dataKey="index" type="category" padding={{ left: 10, right: 12 }} minTickGap={22} height={34} tickMargin={12} tickSize={0} tickLine={false}
                tickFormatter={(index: number) => points[index]?.label ?? ''}
                axisLine={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)' }}
                tick={{ fill: 'var(--nx-ink)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
              <YAxis domain={[0, maximum || 1]} width={42} tickCount={4} axisLine={false} tickLine={false}
                tickFormatter={(value: number) => compact.format(value)}
                tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)', fontWeight: 'var(--nx-type-axis-weight)' }} />
              <Tooltip filterNull={false} isAnimationActive={false} cursor={{ stroke: 'var(--nx-ink)', strokeWidth: 'var(--nx-stroke-hairline)', strokeDasharray: '4 4' }}
                content={({ active, label: index }) => {
                  const point = typeof index === 'number' ? points[index] : undefined;
                  return active && point ? <div role="status" className="max-w-[240px] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-bg)] px-3 py-2 text-[length:var(--nx-type-tooltip-size)] [box-shadow:var(--nx-shadow-popover)_var(--nx-ink)]">
                    <div className="font-[number:var(--nx-font-weight-bold)]">{point.label}</div>
                    <div>{point.value === null ? 'Unavailable' : `${valueFormatter(point.value)} ${unitLabel}`}</div>
                  </div> : null;
                }} />
              <Area id={`${id}-trend`} dataKey="value" name={unitLabel} type="linear" baseValue={0} connectNulls={false}
                fill="var(--nx-seriesC)" fillOpacity={1} stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-emphasis)' }}
                dot={SquarePoint} activeDot={false} {...motion} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>}
  </div>;
}
