import { Beeswarm, type BeeswarmDatum } from './component';

const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const data: BeeswarmDatum[] = Array.from({ length: 120 }, (_, i) => {
  const u = hash(i + 1, 3);
  const enterprise = hash(i + 2, 11) > 0.86;
  return { valueK: Math.min(178, Math.round(4 + (enterprise ? 60 : 6) + 150 * Math.pow(u, 2.6) + hash(i + 3, 7) * 10)), enterprise };
});

export function Example() { return <Beeswarm data={data} />; }
