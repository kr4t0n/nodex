import { SoftArea, type SoftAreaDatum } from './component';

const data: SoftAreaDatum[] = [
  { id: 'w1', label: 'May 04', x: 0, value: 12 },
  { id: 'w2', label: 'May 11', x: 7, value: 17 },
  { id: 'w3', label: 'May 18', x: 14, value: 15 },
  { id: 'w4', label: 'May 25', x: 21, value: 24 },
  { id: 'w5', label: 'Jun 01', x: 28, value: 22 },
  { id: 'w6', label: 'Jun 08', x: 35, value: 29 },
  { id: 'w7', label: 'Jun 15', x: 42, value: 32 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftArea data={data} unitLabel="Completed sessions" contextLabel="Weekly practice" height={364} animate={animate} />;
}
