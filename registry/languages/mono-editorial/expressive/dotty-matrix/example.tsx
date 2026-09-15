import { DottyMatrix, type DottyMatrixDatum } from './component';

const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const data: DottyMatrixDatum[] = ['PLATFORM', 'GROWTH', 'MOBILE', 'INFRA'].map((squad, k) => ({ squad, tasks: Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (__, c) => {
  const load = hash(k * 37 + r * 6 + c + 1, k + 2);
  return load < 0.3 ? 0 : Math.round(load * 12);
})) }));

export function Example() { return <DottyMatrix data={data} />; }
