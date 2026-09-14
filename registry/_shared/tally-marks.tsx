/** Vertical tally units shared by release rows and respondent ballots. */
interface TallyMarksProps {
  from?: number;
  to: number;
  offset?: number;
  x: (value: number) => number | undefined;
  y: number;
  length: readonly [base: number, variation: number];
  lengthSeed: number;
  opacity: readonly [base: number, variation: number];
  opacitySeed?: number;
  opacityOffset?: number;
  thickness: string;
  fill: string;
  series: string;
}
const texture = (unit: number, seed: number) => Math.abs(((unit * 73856093) ^ (seed * 19349663)) % 1000) / 1000;
export function TallyMarks({ from = 0, to, offset = 0, x, y, length, lengthSeed, opacity, opacitySeed = 0, opacityOffset = 0, thickness, fill, series }: TallyMarksProps) {
  return <g data-nx-tally-series={series}>{Array.from({ length: Math.max(0, to - from) }, (_, index) => {
    const unit = from + index; const position = x(unit + offset);
    if (position === undefined) return null;
    const height = length[0] + texture(unit + 1, lengthSeed) * length[1];
    return <rect key={unit} data-nx-tally={unit} x={position} y={y - height / 2} width={thickness} height={height}
      style={{ transform: `translateX(calc(${thickness} * -0.5))` }} fill={fill} opacity={opacity[0] + texture(unit + opacityOffset, opacitySeed) * opacity[1]} />;
  })}</g>;
}
