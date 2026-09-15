import { TickDonut, type TickDonutDatum } from './component';
const channels: readonly TickDonutDatum[] = [
  { channel: 'ORGANIC', percent: 37 }, { channel: 'PAID', percent: 28 },
  { channel: 'REFERRAL', percent: 21 }, { channel: 'SOCIAL', percent: 14 },
];
export function Example({ animate = true }: { animate?: boolean }) { return <TickDonut data={channels} animate={animate} />; }
