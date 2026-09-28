import { NocturneRing, type NocturneRingDatum } from './component';

const data: NocturneRingDatum[] = [
  { id: 'product', label: 'Product', value: 864, tone: 'a' },
  { id: 'platform', label: 'Platform', value: 672, tone: 'b' },
  { id: 'research', label: 'Research', value: 384, tone: 'c' },
  { id: 'operations', label: 'Operations', value: 240, tone: 'd' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneRing data={data} unitLabel="Allocated hours" contextLabel="This cycle" height={344} animate={animate} />;
}
