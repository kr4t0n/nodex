import { LatencyTrend } from './component';

const readings = [
  [48, 142, 224], [52, 148, 240], [50, 136, 218], [54, 161, 262],
  [58, 182, 298], [55, 174, 282], [63, 213, 356], [71, 264, 438],
  [76, 298, 516], [68, 248, 402], [60, 191, 316], [55, 164, 272],
  [52, 158, 254], [59, 176, 286], [65, 218, 342], [57, 183, 294],
] as const;
const data = readings.map(([p50Ms, p95Ms, p99Ms], index) => ({ id: `window-${index}`, label: `12:${String(index * 3).padStart(2, '0')}`, p50Ms, p95Ms, p99Ms }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <LatencyTrend data={data} objectiveMs={300} source="CHECKOUT API" window="16 × 3M WINDOWS" animate={animate} />;
}
