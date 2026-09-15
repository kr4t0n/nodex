import { TickBox, type TickBoxDatum } from './component';

const data: TickBoxDatum[] = [
  { plan: 'ENT', summary: [0.4, 0.9, 1.5, 2.6, 4.4], outliers: [6.2] },
  { plan: 'PRO', summary: [0.8, 2.1, 3.3, 5, 7.8], outliers: [10.5] },
  { plan: 'STARTER', summary: [1.5, 3.8, 6.1, 8.9, 13.2], outliers: [16.8] },
  { plan: 'FREE', summary: [2.2, 6, 9.4, 13.8, 19.6], outliers: [22.1, 23.5] },
];

export function Example() { return <TickBox data={data} />; }
