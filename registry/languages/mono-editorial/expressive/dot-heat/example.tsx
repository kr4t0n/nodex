import { DotHeat, type DotHeatDatum } from './component';

const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const data: DotHeatDatum[] = days.flatMap((day, i) => Array.from({ length: 12 }, (_, j) => {
  const weekday = i < 5 ? 1 : 0.32;
  const shape = Math.exp(-((j - 4.6) ** 2) / 7) + 0.7 * Math.exp(-((j - 8.4) ** 2) / 5);
  return { day, hour: 8 + j, tickets: Math.round(weekday * shape * 22 * (0.6 + hash(i * 12 + j + 1, j + 3) * 0.8)) };
}));

export function Example() { return <DotHeat data={data} />; }
