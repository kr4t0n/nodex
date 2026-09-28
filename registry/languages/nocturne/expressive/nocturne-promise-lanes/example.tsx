import { NocturnePromiseLanes, type NocturnePromiseDatum } from './component';

const data: NocturnePromiseDatum[] = [
  { id: 'research', label: 'Research', planned: [1, 8], actual: [3, 8] },
  { id: 'design', label: 'Design system', planned: [5, 14], actual: [5, 17] },
  { id: 'api', label: 'API migration', planned: [10, 21], actual: [12, 23] },
  { id: 'docs', label: 'Documentation', planned: [17, 25], actual: [16, 23] },
  { id: 'release', label: 'Release review', planned: [24, 28], actual: null },
];
const date = (value: number) => 'Sep ' + value;
const days = (value: number) => (value > 0 ? '+' : '') + value + 'd';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturnePromiseLanes data={data} unitLabel="Promise lanes" contextLabel="September delivery" valueFormatter={date} deltaFormatter={days} height={460} animate={animate} />;
}
