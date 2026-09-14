import { MatrixHeat } from './component';

const features = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT', 'PAGES', 'SYNC'];
const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const data = features.map((_, i) => features.map((__, j) => {
  if (i === j) return null;
  const a = Math.min(i, j); const b = Math.max(i, j);
  return Math.round(((8 - a) / 8) * ((8 - b) / 8) * 62 * (0.35 + hash(a * 8 + b + 1, a + b + 3) * 0.9));
}));

export function Example() { return <MatrixHeat features={features} data={data} />; }
