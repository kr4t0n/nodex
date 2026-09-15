import { HairlineArea, type HairlineAreaDatum } from './component';

const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const months = new Map([[0, 'MAY'], [22, 'JUN'], [44, 'JUL']]);
const data: HairlineAreaDatum[] = Array.from({ length: 45 }, (_, d) => ({ day: `Day ${d + 1}`, valueK: 34 + 26 * Math.sin(d / 7.2) + 12 * Math.sin(d / 2.8) + hash(d + 1, 3) * 16, axisLabel: months.get(d) }));

export function Example() { return <HairlineArea data={data} />; }
