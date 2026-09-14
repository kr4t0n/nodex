import { useMemo } from 'react';
import { Curve, XAxis, YAxis, usePlotArea } from 'recharts';

/** Fit the caller's radial bounds with equal pixel units on both native axes. */
export function RadialTallyAxes({ extent, yDomain = [-extent, extent] }: {
  extent: number; yDomain?: readonly [number, number];
}) {
  const plot = usePlotArea();
  const width = Math.max(1, plot?.width ?? 540); const height = Math.max(1, plot?.height ?? 312);
  const [bottom, top] = yDomain;
  const domains = useMemo(() => {
    const unit = Math.max(2 * extent / width, (top - bottom) / height);
    const halfX = width * unit / 2; const halfY = height * unit / 2;
    const centerY = (bottom + top) / 2;
    return { x: [-halfX, halfX], y: [centerY - halfY, centerY + halfY] };
  }, [extent, bottom, top, width, height]);
  return <>
    <XAxis dataKey="x" type="number" hide domain={domains.x} allowDataOverflow />
    <YAxis dataKey="y" type="number" hide domain={domains.y} allowDataOverflow />
  </>;
}

/** Unit-length texture shared by radial tallies; callers retain their scales and observations. */
export function RadialTallyMarks({ from = 0, to, radius, startAngle, stepAngle, length, seed, x, y, stroke, thickness, series }: {
  from?: number; to: number; radius: number; startAngle: number; stepAngle: number;
  length: readonly [number, number]; seed: number;
  x: (value: number) => number | undefined; y: (value: number) => number | undefined;
  stroke: string; thickness: string; series: string | number;
}) {
  return <g data-nx-radial-series={series}>{Array.from({ length: Math.max(0, to - from) }, (_, offset) => {
    const unit = from + offset; const angle = (startAngle + unit * stepAngle) * Math.PI / 180;
    const texture = Math.abs((((unit + 1) * 73856093) ^ (seed * 19349663)) % 1000) / 1000;
    const end = radius + length[0] + length[1] * texture;
    return <Curve key={unit} data-nx-radial-tick={unit} points={[radius, end].map(r => ({ x: x(r * Math.cos(angle)) ?? 0, y: y(-r * Math.sin(angle)) ?? 0 }))} type="linear" fill="none" stroke={stroke} strokeWidth={thickness} />;
  })}</g>;
}
