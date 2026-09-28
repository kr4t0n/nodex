import { NocturneWaterfall, type NocturneWaterfallDatum } from './component';

const data: NocturneWaterfallDatum[] = [
  { id: 'opening', label: 'Opening', kind: 'start', value: 186 },
  { id: 'expansion', label: 'Expansion', kind: 'change', value: 52 },
  { id: 'downgrade', label: 'Downgrade', kind: 'change', value: -34 },
  { id: 'reactivated', label: 'Reactivated', kind: 'change', value: 18 },
  { id: 'churn', label: 'Churn', kind: 'change', value: -26 },
  { id: 'closing', label: 'Closing', kind: 'total' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneWaterfall data={data} unitLabel="Seats through the quarter" contextLabel="Q3 · licensed seats" height={432} animate={animate} />;
}
