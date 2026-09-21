import { CapacityRing } from './component';

export function Example({ animate = true }: { animate?: boolean }) {
  return <CapacityRing data={{ used: 78, capacity: 96 }} warningAt={0.8} unitLabel="GiB" label="MEMORY CAPACITY" source="WORKER POOL / EU-1" window="SNAPSHOT 14:00 UTC" animate={animate} />;
}
