'use client';

import { useId, useMemo } from 'react';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Text, Tooltip, XAxis, YAxis, matchByDataKey, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { SignalChartFrame, SignalKey, SignalPlot, SignalTooltip, type SignalChartProps } from '../../../../_shared/signal-chart-frame';

export interface EndpointDatum {
  route: string;
  p99Ms: number;
}

export interface EndpointLatencyProps extends SignalChartProps {
  data: readonly EndpointDatum[];
  objectiveMs: number;
}

interface RankedEndpoint extends EndpointDatum { index: number; row: number }
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const routeWidth = 164;
const valueWidth = 72;

function endpointColor(point: EndpointDatum, objective: number | null) {
  return objective === null ? 'var(--nx-muted)' : point.p99Ms > objective ? 'var(--nx-crit)' : 'var(--nx-withinObjective)';
}

/** Labels use native band positions independently of the animated bar geometry. */
function EndpointRows({ ranked, objective }: { ranked: RankedEndpoint[]; objective: number | null }) {
  const plot = usePlotArea(); const x = useXAxisScale(); const y = useYAxisScale();
  if (!plot || !x || !y) return null;
  const valueX = plot.x + plot.width + valueWidth - 2;
  const objectiveX = objective === null ? undefined : x(objective);
  const objectiveAtRight = objectiveX !== undefined && objectiveX > plot.x + plot.width / 2;
  return <g pointerEvents="none" className="tabular-nums">
    <g fill="var(--nx-faint)" fontSize="var(--nx-type-axis-size)" letterSpacing="var(--nx-type-caption-tracking)">
      <text x={0} y={12}>#</text><text x={26} y={12}>ROUTE</text>
      <text x={valueX} y={12} textAnchor="end">P99 / MS</text>
    </g>
    {objectiveX !== undefined && <text x={objectiveX + (objectiveAtRight ? -4 : 4)} y={12} textAnchor={objectiveAtRight ? 'end' : 'start'} fill="var(--nx-warn)" fontSize="var(--nx-type-axis-size)">SLO {number.format(objective!)}MS</text>}
    {ranked.map(point => {
      const cy = y(point.row, { position: 'middle' });
      if (cy === undefined) return null;
      const breached = objective !== null && point.p99Ms > objective;
      return <g key={point.index} data-nx-endpoint-row={point.row} data-nx-endpoint-route={point.route}>
        <line x1={plot.x} x2={plot.x + plot.width} y1={cy} y2={cy} stroke="var(--nx-grid)" strokeWidth="var(--nx-stroke-hairline)" />
        <text x={0} y={cy} dominantBaseline="central" fill="var(--nx-faint)" fontSize="var(--nx-type-axis-size)">{String(point.row + 1).padStart(2, '0')}</text>
        <Text data-nx-endpoint-label x={26} y={cy} width={routeWidth - 38} maxLines={1} breakAll verticalAnchor="middle" fill="var(--nx-ink)"
          style={{ fontSize: 'var(--nx-type-note-size)', fontFamily: 'var(--nx-font-sans)' }}>{point.route}</Text>
        {point.p99Ms === 0 && <line data-nx-endpoint-zero x1={plot.x} x2={plot.x} y1={cy - 5} y2={cy + 5} stroke={endpointColor(point, objective)} strokeWidth="var(--nx-stroke-mark)" />}
        {breached && <text x={plot.x + plot.width + 14} y={cy} dominantBaseline="central" fill="var(--nx-crit)" fontSize="var(--nx-type-note-size)" fontWeight="var(--nx-font-weight-bold)">!</text>}
        <text data-nx-endpoint-value x={valueX} y={cy} dominantBaseline="central" textAnchor="end" fill={breached ? 'var(--nx-crit)' : 'var(--nx-ink)'} fontSize="var(--nx-type-note-size)" fontWeight="var(--nx-type-cardTitle-weight)">{number.format(point.p99Ms)}</text>
      </g>;
    })}
  </g>;
}

/** Ranked tail latency. Color and an exclamation mark identify objective breaches. */
export function EndpointLatency({ data, objectiveMs, label = 'ENDPOINT LATENCY', animate = true, className = '', 'aria-label': accessibleLabel = 'Endpoint tail latency', ...frame }: EndpointLatencyProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const ranked = useMemo(() => data.map((point, index) => ({ ...point, index }))
    .filter(point => Number.isFinite(point.p99Ms) && point.p99Ms >= 0)
    .sort((a, b) => b.p99Ms - a.p99Ms).map((point, row): RankedEndpoint => ({ ...point, row })), [data]);
  const objective = Number.isFinite(objectiveMs) && objectiveMs >= 0 ? objectiveMs : null;
  const breaches = ranked.filter(point => objective !== null && point.p99Ms > objective).length;
  const unavailable = data.length - ranked.length;
  const maximum = Math.max(ranked[0]?.p99Ms ?? 0, objective ?? 0);
  // Single-line labels allow compact bands without shrinking type in overview tiles.
  const plotHeight = Math.max(196, ranked.length * 18 + 52);

  return <SignalChartFrame surface="var(--nx-surface)" {...frame} ref={ref} name="endpoint-latency" label={label} className={`nx-endpoint-latency ${className}`} animated={motion.isAnimationActive}
    status={ranked.length === 0 ? 'No endpoint observations available.' : null}
    summary={<><span className={breaches > 0 ? 'text-[var(--nx-crit)]' : 'text-[var(--nx-ink)]'}>{objective === null || ranked.length === 0 ? '—' : breaches}</span> <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">OF {ranked.length} OVER SLO</span></>}>
    <SignalPlot minWidth={460} height={plotHeight}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: frame.width ?? 540, height: plotHeight }}>
        <BarChart data={ranked} layout="vertical" accessibilityLayer title={accessibleLabel} desc="Routes are ranked from slowest to fastest. Bar length and the right column show p99 latency in milliseconds. Red bars and exclamation marks identify readings above the dashed SLO. A tick at the origin means zero. Use the left arrow key for the next route and the right arrow key for the previous route."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
          margin={{ top: 26, right: valueWidth, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[0, maximum === 0 ? 1 : 'auto']} height={26} tickLine={false} axisLine={false} tickCount={5} tickFormatter={(value: number) => `${number.format(value)}MS`}
            tick={{ fill: 'var(--nx-faint)', fontSize: 'var(--nx-type-axis-size)', fontFamily: 'var(--nx-font-sans)' }} />
          <YAxis type="category" dataKey="row" width={routeWidth} tick={false} axisLine={false} tickLine={false} />
          <EndpointRows ranked={ranked} objective={objective} />
          <Tooltip cursor={{ fill: 'var(--nx-grid)', fillOpacity: 0.35 }} isAnimationActive={false} content={({ active, label: row }) => {
            const point = typeof row === 'number' ? ranked[row] : undefined;
            return active && point ? <SignalTooltip surface="var(--nx-surface)" title={point.route}>
              <div>{number.format(point.p99Ms)}ms p99</div>
              <div className={objective === null ? 'text-[var(--nx-muted)]' : point.p99Ms > objective ? 'text-[var(--nx-crit)]' : 'text-[var(--nx-ok)]'}>
                {objective === null ? 'SLO unavailable' : point.p99Ms > objective ? `! ${number.format(point.p99Ms - objective)}ms over SLO` : 'Within SLO'}
              </div>
              {objective !== null && <div className="text-[var(--nx-muted)]">Objective: {number.format(objective)}ms</div>}
            </SignalTooltip> : null;
          }} />
          <Bar id={`${id}-latencies`} dataKey="p99Ms" name="p99 latency" fill="var(--nx-withinObjective)" barSize={10} activeBar={false} animationMatchBy={matchByDataKey('index')} {...motion}>
            {ranked.map(point => <Cell key={point.index} fill={endpointColor(point, objective)} />)}
          </Bar>
          {objective !== null && <ReferenceLine x={objective} ifOverflow="extendDomain" stroke="var(--nx-warn)" strokeWidth="var(--nx-stroke-hairline)" strokeDasharray="3 4" />}
        </BarChart>
      </ResponsiveContainer>
    </SignalPlot>
    <SignalKey>
      {objective === null ? <span>SLO UNAVAILABLE · BARS UNCLASSIFIED</span> : <><span className="text-[var(--nx-ok)]">WITHIN SLO</span><span className="text-[var(--nx-crit)]">! OVER SLO</span></>}
      {unavailable > 0 && <span>{unavailable} UNAVAILABLE</span>}
    </SignalKey>
  </SignalChartFrame>;
}
