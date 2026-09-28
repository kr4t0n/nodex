import { NocturneMarginLanes, type NocturneMarginDatum } from './component';

const data: NocturneMarginDatum[] = [
  { id: 'design', label: 'Design', target: 40, value: 34, range: [35, 44] },
  { id: 'engineering', label: 'Engineering', target: 60, value: 58, range: [61, 68] },
  { id: 'research', label: 'Research', target: 30, value: 24, range: [22, 28] },
  { id: 'operations', label: 'Operations', target: 40, value: 40, range: [37, 43] },
  { id: 'support', label: 'Support', target: 35, value: 42, range: [39, 47] },
];
const hours = (value: number) => value + 'h';
const difference = (value: number) => (value > 0 ? '+' : '') + value + 'h';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneMarginLanes data={data} unitLabel="Effort against plan" contextLabel="Current · expected at close" valueFormatter={hours} deltaFormatter={difference} height={410} animate={animate} />;
}
