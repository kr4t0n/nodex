import { SoftStackedBars, type SoftStackedBarsDatum, type SoftStackedBarsSeries } from './component';

const series: SoftStackedBarsSeries[] = [
  { id: 'create', label: 'Create', tone: 'a' },
  { id: 'learn', label: 'Learn', tone: 'b' },
  { id: 'connect', label: 'Connect', tone: 'c' },
];
const data: SoftStackedBarsDatum[] = [
  { id: 'week1', label: 'Week 1', values: { create: 12, learn: 6, connect: 4 } },
  { id: 'week2', label: 'Week 2', values: { create: 14, learn: 8, connect: 5 } },
  { id: 'week3', label: 'Week 3', values: { create: 10, learn: 9, connect: 7 } },
  { id: 'week4', label: 'Week 4', values: { create: 16, learn: 7, connect: 6 } },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftStackedBars data={data} series={series} unitLabel="Hours" contextLabel="Small things, adding up" height={364} animate={animate} />;
}
