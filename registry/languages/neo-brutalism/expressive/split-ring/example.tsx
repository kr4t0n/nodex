import { SplitRing, type SplitRingDatum } from './component';

const orders: readonly SplitRingDatum[] = [
  { id: 'web', label: 'Web store', value: 432, tone: 'a' },
  { id: 'app', label: 'Mobile app', value: 288, tone: 'b' },
  { id: 'retail', label: 'Retail', value: 168, tone: 'c' },
  { id: 'partner', label: 'Partners', value: 72, tone: 'd' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SplitRing data={orders} unitLabel="Orders" contextLabel="This month"
    animate={animate} aria-label="Order share by sales channel" />;
}
