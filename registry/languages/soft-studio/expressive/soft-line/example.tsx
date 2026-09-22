import { SoftLine, type SoftLineDatum, type SoftLineSeries } from './component';

const series: SoftLineSeries[] = [
  { id: 'focus', label: 'Focus', tone: 'a' },
  { id: 'restore', label: 'Restore', tone: 'b' },
];
const data: SoftLineDatum[] = [
  { id: 'mon', label: 'Mon', x: 0, values: { focus: 4, restore: 2 } },
  { id: 'tue', label: 'Tue', x: 1, values: { focus: 5, restore: 3 } },
  { id: 'wed', label: 'Wed', x: 2, values: { focus: 3.5, restore: 2.5 } },
  { id: 'thu', label: 'Thu', x: 3, values: { focus: 6, restore: 3 } },
  { id: 'fri', label: 'Fri', x: 4, values: { focus: 5, restore: 4 } },
  { id: 'sat', label: 'Sat', x: 5, values: { focus: 3, restore: 5 } },
  { id: 'sun', label: 'Sun', x: 6, values: { focus: 2, restore: 4.5 } },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftLine data={data} series={series} unitLabel="Hours" contextLabel="A rhythm of your own" height={364} animate={animate} />;
}
