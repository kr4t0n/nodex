/** Unit marks shared by rung charts; layout and series stay in each chart. */
export function rungCount(value: number | null): number | null {
  return value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// Preserve the specimens' deterministic variation in width and opacity.
function texture(unit: number, seed: number): number {
  return Math.abs(((unit * 73856093) ^ (seed * 19349663)) % 1000) / 1000;
}

interface RungMarksProps {
  x: number;
  bottom: number;
  step: number;
  count: number | null;
  width: readonly [base: number, variation: number];
  widthSeed: number;
  opacity: readonly [base: number, variation: number];
  opacitySeed: number;
  fill: string;
  observation: number;
  series: string;
  countingDots?: boolean;
  countingDotOffset?: number;
  countingDotRadius?: number;
  countingDotOpacity?: number;
  broken?: boolean;
}

export function RungMarks({ x, bottom, step, count, width, widthSeed, opacity, opacitySeed, fill, observation, series, countingDots = false,
  countingDotOffset = 19, countingDotRadius = 0.8, countingDotOpacity = 0.8, broken = false }: RungMarksProps) {
  return <g data-nx-observation={observation} data-nx-series={series}>
    {Array.from({ length: count ?? 0 }, (_, unit) => {
      const length = width[0] + texture(unit + 1, widthSeed) * width[1];
      const y = bottom - (unit + 1) * step;
      return <g key={unit}>
        {broken ? [-1, 1].map((side) => <rect key={side} data-nx-rung={unit} data-nx-broken-rung={side}
          x={x + side * length / 3.4 - length * 0.2} y={y} width={length * 0.4} height="var(--nx-stroke-mark)"
          style={{ transform: 'translateY(calc(var(--nx-stroke-mark) * -0.5))' }} fill={fill}
          opacity={opacity[0] + texture(unit + 2, opacitySeed) * opacity[1]} />) : <rect data-nx-rung={unit} x={x - length / 2} y={y} width={length} height="var(--nx-stroke-mark)"
          style={{ transform: 'translateY(calc(var(--nx-stroke-mark) * -0.5))' }}
          fill={fill} opacity={opacity[0] + texture(unit + 2, opacitySeed) * opacity[1]} />}
        {countingDots && unit % 5 === 4 && <circle data-nx-counting-dot={unit} cx={x + countingDotOffset} cy={y} r={countingDotRadius} fill="var(--nx-faint)" opacity={countingDotOpacity} pointerEvents="none" />}
      </g>;
    })}
  </g>;
}
