'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface RadialConvergenceDatum { id: string; themeId: string | null }
export interface RadialConvergenceTheme { id: string; name: string; degrees: number }
export interface RadialConvergenceProps {
  data: readonly RadialConvergenceDatum[];
  themes: readonly RadialConvergenceTheme[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface RequestPoint { kind: 'request'; id: string; index: number; x: number; y: number; degrees: number; theme: RadialConvergenceTheme | null }
interface ThemePoint { kind: 'theme'; id: string; index: number; x: number; y: number; degrees: number; theme: RadialConvergenceTheme; count: number }
type NetworkPoint = RequestPoint | ThemePoint;
function at(radius: number, degrees: number) { const angle = degrees * Math.PI / 180; return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }; }
function NodeMark(props: unknown) {
  const { payload, cx, cy, isAnimating, animationElapsedTime } = props as { payload?: NetworkPoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number };
  if (!payload || cx === undefined || cy === undefined) return <g />;
  const progress = isAnimating ? animationElapsedTime ?? 0 : 1;
  const radius = payload.kind === 'request' ? 1.6 : Math.sqrt(payload.count) * 1.55;
  return <g data-nx-observation={`${payload.kind}-${payload.id}`} opacity={0.8}>{radius > 0 && <circle data-nx-node={payload.id} data-nx-node-kind={payload.kind} data-nx-count={payload.kind === 'theme' ? payload.count : undefined} cx={cx} cy={cy} r={radius * progress} fill={payload.kind === 'request' ? 'var(--nx-markMuted)' : 'var(--nx-ink)'} />}</g>;
}
function NetworkGuides({ requests, hubs }: { requests: readonly RequestPoint[]; hubs: readonly ThemePoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  const point = (p: { x: number; y: number }) => ({ x: xScale(p.x) ?? 0, y: yScale(p.y) ?? 0 });
  return <g pointerEvents="none" aria-hidden="true">
    {requests.flatMap(row => {
      if (!row.theme) return [];
      const to = at(34, row.theme.degrees);
      const points = Array.from({ length: 19 }, (_, index) => { const t = index / 18; const a = (1 - t) ** 3 + 3 * (1 - t) ** 2 * t * 0.42; const b = 3 * (1 - t) * t * t * 0.3 + t ** 3; return point({ x: a * row.x + b * to.x, y: a * row.y + b * to.y }); });
      return <Curve key={row.id} data-nx-request-link={row.id} points={points} type="linear" fill="none" stroke="var(--nx-markSoft)" strokeWidth="var(--nx-stroke-hairline)" opacity={0.55} />;
    })}
    {hubs.map(hub => <Curve key={hub.id} data-nx-theme-leader={hub.id} points={[point(hub), point(at(138, hub.degrees))]} type="linear" fill="none" stroke="var(--nx-faint)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="1 3" />)}
  </g>;
}
function NetworkLabels({ requests, hubs }: { requests: readonly RequestPoint[]; hubs: readonly ThemePoint[] }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true" opacity={0.8}>
    {requests.map(row => { const p = at(123, row.degrees); const x = xScale(p.x) ?? 0; const y = yScale(p.y) ?? 0; const flipped = Math.cos(row.degrees * Math.PI / 180) < 0;
      return <text key={row.id} data-nx-request-label={row.id} x={x} y={y} transform={`rotate(${-row.degrees - (flipped ? 180 : 0)} ${x} ${y})`} textAnchor="middle" dominantBaseline="central" fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size) * 5.5 / 8)">{row.id}</text>;
    })}
    {hubs.map(hub => { const p = at(150, hub.degrees); return <text key={hub.id} data-nx-theme-label={hub.id} x={xScale(p.x)} y={yScale(p.y)} textAnchor="middle" dominantBaseline="central" fill="var(--nx-ink)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-pageTitle-weight)">{hub.theme.name} · {hub.count}</text>; })}
  </g>;
}

/** A single native node series owns requests and counted hubs; guide curves never become stops. */
export function RadialConvergence({ data, themes, height, width, animate = true, className = '', 'aria-label': label = 'Requests grouped into themes' }: RadialConvergenceProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const layout = useMemo(() => {
    const valid = data.length > 0 && data.every(row => row.id.length > 0) && new Set(data.map(row => row.id)).size === data.length && themes.every(theme => theme.id.length > 0 && Number.isFinite(theme.degrees)) && new Set(themes.map(theme => theme.id)).size === themes.length;
    const byId = new Map(themes.map(theme => [theme.id, theme]));
    const requests: RequestPoint[] = data.map((row, index) => { const degrees = 90 - index / Math.max(1, data.length) * 360; return { kind: 'request', id: row.id, index, degrees, ...at(116, degrees), theme: row.themeId === null ? null : byId.get(row.themeId) ?? null }; });
    const counts = new Map<string, number>(); for (const request of requests) if (request.theme) counts.set(request.theme.id, (counts.get(request.theme.id) ?? 0) + 1);
    const hubs: ThemePoint[] = themes.map((theme, index) => ({ kind: 'theme', id: theme.id, index, degrees: theme.degrees, ...at(34, theme.degrees), theme, count: counts.get(theme.id) ?? 0 }));
    return { valid, requests, hubs, rows: [...requests, ...hubs] };
  }, [data, themes]);
  return <div ref={ref} className={`nx-radial-convergence flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
    style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="radial-convergence" data-nx-animated={motion.isAnimationActive}>
    {!layout.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No valid request network available.</div> : <div className={height === undefined ? 'aspect-[420/380] min-h-[304px] w-full' : 'min-h-0 flex-1'}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 489 }}>
        <ScatterChart accessibilityLayer title={label} desc="Each rim code is a request; its strand leads to the caller-assigned theme. Hub area counts assigned requests. Requests without a known theme have no strand. Use the left and right arrow keys to inspect requests and themes."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 10, bottom: 10, left: 12, right: 12 }}>
          <XAxis dataKey="x" type="number" hide domain={[-162, 162]} />
          <YAxis dataKey="y" type="number" hide domain={[-162, 162]} />
          <NetworkGuides requests={layout.requests} hubs={layout.hubs} />
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as NetworkPoint | undefined;
            return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.kind === 'theme' ? `${row.theme.name} — ${row.count} requests` : `${row.id} — ${row.theme?.name ?? 'Theme unavailable'}`}</div> : null;
          }} />
          <Scatter id={`${id}-nodes`} data={layout.rows} name="Requests and themes" fill="var(--nx-ink)" shape={NodeMark} activeShape={NodeMark} {...motion} />
          <NetworkLabels requests={layout.requests} hubs={layout.hubs} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
