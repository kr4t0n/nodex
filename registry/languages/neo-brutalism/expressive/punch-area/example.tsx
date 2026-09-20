import { PunchArea, type PunchAreaDatum } from './component';

const weeks: readonly PunchAreaDatum[] = [
  { id: 'w1', label: 'Aug 03', value: 3200 },
  { id: 'w2', label: 'Aug 10', value: 4600 },
  { id: 'w3', label: 'Aug 17', value: 3900 },
  { id: 'w4', label: 'Aug 24', value: 6100 },
  { id: 'w5', label: 'Aug 31', value: 5400 },
  { id: 'w6', label: 'Sep 07', value: 7200 },
  { id: 'w7', label: 'Sep 14', value: 6800 },
  { id: 'w8', label: 'Sep 21', value: 8400 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <PunchArea data={weeks} unitLabel="Active users" contextLabel="8 weeks"
    animate={animate} aria-label="Weekly active users over eight weeks" />;
}
