import { NocturneBoxplot, type NocturneBoxDatum } from './component';

const data: NocturneBoxDatum[] = [
  { id: 'search', label: 'Search', summary: [42, 68, 86, 112, 156], outliers: [{ id: 's1', value: 182 }, { id: 's2', value: 208 }] },
  { id: 'catalog', label: 'Catalog', summary: [28, 46, 61, 80, 118], outliers: [{ id: 'c1', value: 151 }] },
  { id: 'checkout', label: 'Checkout', summary: [72, 108, 134, 164, 218], outliers: [{ id: 'c1', value: 246 }] },
  { id: 'account', label: 'Account', summary: [36, 57, 74, 98, 142] },
  { id: 'media', label: 'Media', summary: [54, 83, 105, 142, 194], outliers: [{ id: 'm1', value: 232 }] },
];
const milliseconds = (value: number) => value + 'ms';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneBoxplot data={data} unitLabel="Response time spread" contextLabel="Last 24 hours · ms" valueFormatter={milliseconds} height={432} animate={animate} />;
}
