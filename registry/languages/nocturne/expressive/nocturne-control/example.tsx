import { NocturneControl } from './component';

const values = [73, 69, 76, 71, 82, 78, 74, 68, 75, 84, 80, 77, 93, 86, 79, 72];
const data = values.map((value, index) => ({ id: 'day-' + (index + 1), label: String(index + 1).padStart(2, '0'), x: index + 1, value }));
const limits = { lower: 58, center: 74, upper: 90 };
const events = [{ id: 'release', x: 11, label: 'Queue routing changed · day 11' }];
const milliseconds = (value: number) => value + 'ms';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneControl data={data} limits={limits} events={events} unitLabel="Is the process holding?" contextLabel="Daily median latency · ms" valueFormatter={milliseconds} height={512} animate={animate} />;
}
