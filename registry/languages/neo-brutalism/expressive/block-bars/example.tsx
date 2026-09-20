import { BlockBars, type BlockBarsDatum } from './component';

const channels: readonly BlockBarsDatum[] = [
  { id: 'direct', label: 'Direct', value: 1240, tone: 'a' },
  { id: 'organic', label: 'Organic', value: 860, tone: 'b' },
  { id: 'referrals', label: 'Referrals', value: 1080, tone: 'c' },
  { id: 'social', label: 'Social', value: 620, tone: 'd' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <BlockBars data={channels} unitLabel="Sign-ups" contextLabel="Last 30 days"
    animate={animate} aria-label="Sign-ups by acquisition channel over the last 30 days" />;
}
