import { HundredBlocks, type HundredBlocksDatum } from './component';
const allocation: readonly HundredBlocksDatum[] = [
  { id: 'product', label: 'Product', percent: 42, tone: 'a' },
  { id: 'engineering', label: 'Engineering', percent: 28, tone: 'b' },
  { id: 'growth', label: 'Growth', percent: 18, tone: 'c' },
  { id: 'operations', label: 'Operations', percent: 12, tone: 'd' },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <HundredBlocks data={allocation} unitLabel="Team allocation" contextLabel="100% of capacity" animate={animate} />;
}
