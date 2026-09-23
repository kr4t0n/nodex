'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey, useXAxisScale, useYAxisScale, type BarShapeProps } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface ResponseCodesDatum { id: string; label: string; success: number | null; redirect: number | null; clientError: number | null; serverError: number | null }
export interface ResponseCodesProps extends SignalChartProps { data: readonly ResponseCodesDatum[] }
interface Window extends ResponseCodesDatum { index: number; total: number | null }
const number = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const groups = [
  { key: 'success', label: '2XX SUCCESS', fill: 'var(--nx-ok)' },
  { key: 'redirect', label: '3XX REDIRECT', fill: 'var(--nx-muted)' },
  { key: 'clientError', label: '4XX CLIENT ERROR', fill: 'var(--nx-warn)' },
  { key: 'serverError', label: '5XX SERVER ERROR', fill: 'var(--nx-crit)' },
] as const;

function Segment({ props, group }: { props: BarShapeProps; group: typeof groups[number] }) {
  const point = props.payload as Window;
  if (point.total === null || !point[group.key]) return <g />;
  return <Rectangle x={props.x} y={props.y} width={props.width} height={props.height} fill={group.fill} stroke="none"
    data-nx-response={point.id} data-nx-code={group.key} data-nx-count={point[group.key]} />;
}

function EmptyWindows({ data }: { data: Window[] }) {
  const x = useXAxisScale(); const y = useYAxisScale();
  if (!x || !y) return null;
  return <g>{data.filter(point => !point.total).map(point => <text key={point.id} data-nx-response-state={point.id} x={x(point.index)} y={(y(0) ?? 0) - 5} textAnchor="middle"
    fill="var(--nx-muted)" fontSize="var(--nx-type-axis-size)">{point.total === null ? '?' : '0'}</text>)}</g>;
}

/** Every stack is a complete count. An unknown class makes its whole window unavailable. */
export function ResponseCodes({ data, label = 'HTTP RESPONSE CODES', animate = true, 'aria-label': accessibleLabel = 'Response counts by status class and window', ...frame }: ResponseCodesProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const windows = useMemo(() => data.map((point, index): Window => {
    const complete = groups.every(group => point[group.key] !== null && Number.isSafeInteger(point[group.key]) && point[group.key]! >= 0);
    const total = complete ? groups.reduce((sum, group) => sum + point[group.key]!, 0) : null;
    const known = total !== null && Number.isSafeInteger(total);
    return { ...point, index, total: known ? total : null, success: known ? point.success : null, redirect: known ? point.redirect : null,
      clientError: known ? point.clientError : null, serverError: known ? point.serverError : null };
  }), [data]);
  const validIds = data.every(point => point.id.trim()) && new Set(data.map(point => point.id)).size === data.length;
  const latest = windows.at(-1);
  const rate = latest?.total ? 100 * latest.serverError! / latest.total : null;
  const status = !validIds ? 'Each window needs a unique, nonempty ID.' : !windows.some(point => point.total !== null) ? 'No complete response windows available.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="response-codes" label={label} animated={motion.isAnimationActive} status={status}
    summary={<>{status || rate === null ? '—' : `${rate.toFixed(2)}%`} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">5XX / LATEST</span></>}>
    <SignalPlot minWidth={Math.max(360, windows.length * 22 + 56)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 220 }}>
        <BarChart data={windows} accessibilityLayer title={accessibleLabel} desc="Stack heights show request counts, with status classes in a fixed order. A question mark is an incomplete window; 0 is a measured empty window. Use left and right arrows to inspect."
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }} barCategoryGap="24%" className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <CartesianGrid vertical={false} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
          <XAxis dataKey="index" tickFormatter={(index: number) => windows[index]?.label ?? ''} minTickGap={26} height={28} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis domain={[0, 'auto']} width={44} allowDecimals={false} tickCount={4} tickFormatter={(value: number) => compact.format(value)} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip filterNull={false} isAnimationActive={false} cursor={false} content={({ active, label: index }) => {
            const point = typeof index === 'number' ? windows[index] : undefined;
            return active && point ? <SignalTooltip surface="var(--nx-surface)" title={point.label}>{point.total === null ? 'Unavailable: incomplete response counts.' : <>{groups.map(group => <div key={group.key}>{group.label}: {number.format(point[group.key]!)}</div>)}<div className="mt-1">TOTAL: {number.format(point.total)}</div></>}</SignalTooltip> : null;
          }} />
          {groups.map(group => <Bar key={group.key} id={`${id}-${group.key}`} dataKey={group.key} name={group.label} stackId="responses" fill={group.fill}
            shape={props => <Segment props={props} group={group} />} activeBar={false} animationMatchBy={matchByDataKey('id')} {...motion} />)}
          <EmptyWindows data={windows} />
        </BarChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey>{groups.map(group => <span key={group.key} className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2" style={{ background: group.fill }} />{group.label}</span>)}</SignalKey>
  </SignalChartFrame>;
}
