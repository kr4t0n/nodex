import { RankStrip, type RankStripDatum } from './component';
const products: readonly RankStripDatum[] = [
  { name: 'Flows', ranks: [5, 3, 2, 1, 1, 1] },
  { name: 'Editor', ranks: [1, 1, 1, 2, 2, 2] },
  { name: 'Boards', ranks: [2, 2, 3, 3, 3, 4] },
  { name: 'Vault', ranks: [4, 5, 5, 4, 4, 3] },
  { name: 'Docs', ranks: [3, 4, 4, 5, 5, 5] },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <RankStrip data={products} periods={['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']} animate={animate} />;
}
