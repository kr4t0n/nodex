import { SoftBars, type SoftBarsDatum } from './component';

const data: SoftBarsDatum[] = [
  { id: 'mon', label: 'Mon', value: 3.5, tone: 'a' },
  { id: 'tue', label: 'Tue', value: 5, tone: 'b' },
  { id: 'wed', label: 'Wed', value: 4, tone: 'c' },
  { id: 'thu', label: 'Thu', value: 6, tone: 'd' },
  { id: 'fri', label: 'Fri', value: 4.5, tone: 'a' },
  { id: 'sat', label: 'Sat', value: 2, tone: 'b' },
  { id: 'sun', label: 'Sun', value: 1, tone: 'c' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftBars data={data} unitLabel="Focused hours" contextLabel="This week" height={364} animate={animate} />;
}
