import { MatrixHeatGlance, type MatrixHeatGlanceDatum } from './component';

const features = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT'];
const releases = ['v2.0', 'v1.9', 'v1.8', 'v1.7', 'v1.6'];
const baseline = [88, 74, 61, 42, 35, 27];
const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const data: MatrixHeatGlanceDatum[] = releases.map((release, r) => ({ release, adoption: features.map((_, c) =>
  Math.max(2, Math.round((baseline[c] ?? 0) - r * (6 + c * 0.8) + (hash(r * 6 + c + 1, c + 3) - 0.5) * 10))) }));

export function Example() { return <MatrixHeatGlance features={features} data={data} />; }
