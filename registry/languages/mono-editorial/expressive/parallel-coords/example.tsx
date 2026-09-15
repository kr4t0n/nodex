import { ParallelCoords, type ParallelCoordsDatum, type ParallelCoordsDimension } from './component';
const dimensions: readonly ParallelCoordsDimension[] = [{ label: 'PRICE $', min: 8, max: 30, scored: false }, { label: 'CSAT', min: 6, max: 9.6, scored: true }, { label: 'RETENTION %', min: 55, max: 95, scored: true }, { label: 'GROWTH %', min: -5, max: 40, scored: true }];
const data: readonly ParallelCoordsDatum[] = [
  { product: 'Editor', values: [12, 9.1, 91, 22] }, { product: 'Boards', values: [18, 8.4, 86, 18] },
  { product: 'Forms', values: [9, 8.8, 78, 31] }, { product: 'Docs', values: [15, 8.0, 82, 12] },
  { product: 'Chat', values: [7, 7.2, 64, 8] }, { product: 'Vault', values: [24, 7.8, 88, 6] },
  { product: 'Flows', values: [21, 8.6, 90, 38] }, { product: 'Views', values: [11, 7.5, 71, 14] },
  { product: 'Sync', values: [16, 6.9, 58, -2] }, { product: 'Pages', values: [8, 8.2, 74, 19] },
  { product: 'Grid', values: [19, 7.1, 62, 4] }, { product: 'Hub', values: [13, 6.6, 52, 9] },
];
export function Example() { return <ParallelCoords data={data} dimensions={dimensions} />; }
