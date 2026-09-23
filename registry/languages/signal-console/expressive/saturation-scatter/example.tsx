import { SaturationScatter } from './component';

const readings = [[18, 42], [24, 58], [28, 51], [32, 76], [36, 62], [39, 92], [43, 82], [46, 110], [48, 96], [51, 132], [55, 114], [57, 151], [61, 138], [64, 176], [67, 162], [71, 205], [74, 184], [78, 228], [82, 212], [86, 274], [88, 324], [92, 382], [81, 304], [69, 268]] as const;
const data = readings.map(([cpuPercent, latencyMs], index) => ({ id: `host-${index}`, label: `worker-${String(index + 1).padStart(2, '0')}`, cpuPercent, latencyMs }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <SaturationScatter data={data} cpuThresholdPercent={75} latencyObjectiveMs={250} source="WORKER POOL / EU-1" window="5M P99 / HOST" animate={animate} />;
}
