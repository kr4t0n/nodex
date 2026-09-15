import { useXAxisScale, useYAxisScale } from 'recharts';

interface ZeroAxisRailProps {
  ticks: readonly number[];
  domain: readonly [number, number];
  stroke: string;
  tickStroke: string;
}

/** The axis rail crosses y=0 while its native XAxis labels stay below the plot. */
export function ZeroAxisRail({ ticks, domain, stroke, tickStroke }: ZeroAxisRailProps) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale();
  const y = yScale?.(0);
  if (!xScale || y === undefined) return null;
  return <g aria-hidden="true" pointerEvents="none">
    <line x1={xScale(domain[0])} x2={xScale(domain[1])} y1={y} y2={y} stroke={stroke} strokeWidth="calc(var(--nx-stroke-hairline) * 8 / 7)" />
    {ticks.map((tick) => <line key={tick} x1={xScale(tick)} x2={xScale(tick)} y1={y} y2={y + 4} stroke={tickStroke} strokeWidth="calc(var(--nx-stroke-hairline) * 6 / 7)" />)}
  </g>;
}
