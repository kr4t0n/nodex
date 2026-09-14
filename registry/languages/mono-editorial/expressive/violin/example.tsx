import { Violin, type ViolinDatum } from './component';

const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const plans = [['ENT', 1.6, 0.8], ['PRO', 3.4, 1.6], ['STARTER', 6.2, 2.6], ['FREE', 9.5, 4.2]] as const;
const data: ViolinDatum[] = plans.map(([plan, centre, spread], g) => ({ plan, bandwidth: Math.max(0.9, spread * 0.62), hours: Array.from({ length: 64 }, (_, i) => {
  const noise = hash(i + 1, g * 3 + 1) + hash(i + 7, g * 3 + 2) + hash(i + 13, g * 3 + 3);
  return Math.max(0.2, centre + spread * (noise - 1.5));
}) }));

export function Example() { return <Violin data={data} />; }
