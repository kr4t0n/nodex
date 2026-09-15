import { BarcodeLollipop, type BarcodeLollipopDatum } from './component';
const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const days: readonly BarcodeLollipopDatum[] = Array.from({ length: 90 }, (_, d) => ({
  day: `Day ${d + 1}`, peakUsers: 95 + 55 * Math.sin(d / 9.5) + 30 * Math.sin(d / 3.7) + rnd(d + 1, 5) * 40,
  weekend: d % 7 === 5 || d % 7 === 6, axisLabel: d === 0 ? 'APR' : undefined,
}));
export function Example({ animate = true }: { animate?: boolean }) {
  return <BarcodeLollipop data={days} animate={animate} />;
}
