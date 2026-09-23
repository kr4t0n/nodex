'use client';

import { useId, useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, matchByDataKey, usePlotArea } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface ServiceHealthAxis { id: string; label: string }
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'down';
export interface ServiceHealthDatum { serviceId: string; windowId: string; status: ServiceHealthStatus | null }
export interface ServiceHealthProps extends SignalChartProps {
  data: readonly ServiceHealthDatum[];
  services: readonly ServiceHealthAxis[];
  windows: readonly ServiceHealthAxis[];
}
interface Cell { id: string; service: string; window: string; x: number; y: number; status: ServiceHealthStatus | null }
const states = {
  healthy: { fill: 'var(--nx-ok)', symbol: '·', label: 'HEALTHY' },
  degraded: { fill: 'var(--nx-warn)', symbol: '!', label: 'DEGRADED' },
  down: { fill: 'var(--nx-crit)', symbol: '×', label: 'DOWN' },
  unavailable: { fill: 'var(--nx-grid)', symbol: '?', label: 'UNAVAILABLE' },
};

function HealthCell({ props, rows, columns }: { props: unknown; rows: number; columns: number }) {
  const plot = usePlotArea();
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Cell };
  if (!plot || cx === undefined || cy === undefined || !payload) return <g />;
  const width = Math.max(1, plot.width / columns - 4); const height = Math.max(1, plot.height / rows - 4);
  const state = states[payload.status ?? 'unavailable'];
  return <g data-nx-health={payload.id} data-nx-state={payload.status ?? 'unavailable'}>
    <rect x={cx - width / 2} y={cy - height / 2} width={width} height={height} fill={state.fill} stroke="none" />
    <text x={cx} y={cy} dominantBaseline="central" textAnchor="middle" fill={payload.status === null ? 'var(--nx-muted)' : 'var(--nx-bg)'} fontSize="var(--nx-type-body-size)" fontWeight="var(--nx-font-weight-bold)">{state.symbol}</text>
  </g>;
}

/** A declared service × window matrix. Absent pairs are unavailable, never healthy. */
export function ServiceHealth({ data, services, windows, label = 'SERVICE HEALTH', animate = true, 'aria-label': accessibleLabel = 'Service health by observation window', ...frame }: ServiceHealthProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const { cells, valid } = useMemo(() => {
    const unique = (axis: readonly ServiceHealthAxis[]) => axis.every(item => item.id.trim()) && new Set(axis.map(item => item.id)).size === axis.length;
    let valid = unique(services) && unique(windows);
    const serviceIds = new Set(services.map(item => item.id)); const windowIds = new Set(windows.map(item => item.id));
    const readings = new Map<string, ServiceHealthStatus | null>();
    for (const datum of data) {
      const key = JSON.stringify([datum.serviceId, datum.windowId]);
      if (!serviceIds.has(datum.serviceId) || !windowIds.has(datum.windowId) || readings.has(key)) valid = false;
      readings.set(key, datum.status === 'healthy' || datum.status === 'degraded' || datum.status === 'down' ? datum.status : null);
    }
    const cells = services.flatMap((service, y) => windows.map((window, x): Cell => {
      const id = JSON.stringify([service.id, window.id]);
      return { id, service: service.label, window: window.label, x, y, status: readings.get(id) ?? null };
    }));
    return { cells, valid };
  }, [data, services, windows]);
  const healthy = cells.filter(cell => cell.x === windows.length - 1 && cell.status === 'healthy').length;
  const status = !valid ? 'Use unique axis IDs and one observation per declared service and window.' : !cells.length ? 'Declare services and observation windows.' : null;
  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="service-health" label={label} animated={motion.isAnimationActive} status={status}
    summary={<>{status ? '—' : `${healthy}/${services.length}`} <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">HEALTHY / LATEST</span></>}>
    <SignalPlot minWidth={Math.max(360, windows.length * 26 + 108)} height={Math.max(220, services.length * 32 + 32)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 580, height: 240 }}>
        <ScatterChart accessibilityLayer title={accessibleLabel} desc="Each cell is one service in one window: dot healthy, exclamation degraded, cross down, question mark unavailable. Use left and right arrows to inspect cells in service order."
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }} className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]">
          <XAxis dataKey="x" type="number" domain={[-0.5, windows.length - 0.5]} ticks={windows.map((_, index) => index)} tickFormatter={(index: number) => windows[index]?.label ?? ''}
            minTickGap={26} height={28} tickLine={false} axisLine={false} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <YAxis dataKey="y" type="number" reversed domain={[-0.5, services.length - 0.5]} ticks={services.map((_, index) => index)} interval={0} tickFormatter={(index: number) => services[index]?.label ?? ''}
            width={100} tickLine={false} axisLine={false} tick={{ fill: 'var(--nx-muted)', fontSize: 'var(--nx-type-axis-size)' }} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const cell = payload?.[0]?.payload as Cell | undefined;
            return active && cell ? <SignalTooltip surface="var(--nx-surface)" title={`${cell.service} · ${cell.window}`}>{states[cell.status ?? 'unavailable'].label}</SignalTooltip> : null;
          }} />
          <Scatter id={`${id}-health`} data={cells} fill="var(--nx-ok)" shape={props => <HealthCell props={props} rows={services.length} columns={windows.length} />}
            activeShape={false} animationMatchBy={matchByDataKey('id')} {...motion} />
        </ScatterChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey>{Object.entries(states).map(([key, state]) => <span key={key} className="flex items-center gap-1.5"><span aria-hidden className="flex h-3 w-3 items-center justify-center" style={{ background: state.fill, color: key === 'unavailable' ? 'var(--nx-muted)' : 'var(--nx-bg)' }}>{state.symbol}</span>{state.label}</span>)}</SignalKey>
  </SignalChartFrame>;
}
