import { SoftDonut, type SoftDonutDatum } from './component';

const data: SoftDonutDatum[] = [
  { id: 'create', label: 'Create', value: 14, tone: 'a' },
  { id: 'learn', label: 'Learn', value: 8, tone: 'b' },
  { id: 'connect', label: 'Connect', value: 5, tone: 'c' },
  { id: 'plan', label: 'Plan', value: 3, tone: 'd' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftDonut data={data} unitLabel="Hours" contextLabel="Your week, in balance" height={384} animate={animate} />;
}
