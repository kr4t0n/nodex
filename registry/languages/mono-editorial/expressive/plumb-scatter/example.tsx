import { PlumbScatter, type PlumbScatterDatum } from './component';

const observations: readonly PlumbScatterDatum[] = [
  { product: 'Editor', pricePercentile: 72, satisfaction: 86 },
  { product: 'Boards', pricePercentile: 58, satisfaction: 74 },
  { product: 'Docs', pricePercentile: 44, satisfaction: 79 },
  { product: 'Chat', pricePercentile: 38, satisfaction: 62 },
  { product: 'Flows', pricePercentile: 66, satisfaction: 58 },
  { product: 'Vault', pricePercentile: 82, satisfaction: 71 },
  { product: 'Pages', pricePercentile: 28, satisfaction: 55 },
  { product: 'Sync', pricePercentile: 52, satisfaction: 49 },
  { product: 'Grid', pricePercentile: 88, satisfaction: 44 },
  { product: 'Views', pricePercentile: 20, satisfaction: 68 },
  { product: 'Hub', pricePercentile: 76, satisfaction: 32 },
  { product: 'Forms', pricePercentile: 34, satisfaction: 38 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <PlumbScatter data={observations} animate={animate} />;
}
