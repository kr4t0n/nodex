import { RungWaterfall, type RungWaterfallDatum } from './component';

const observations: readonly RungWaterfallDatum[] = [
  { label: 'GROSS', kind: 'start', valueK: 42 }, { label: 'REFUNDS', kind: 'change', valueK: -6 },
  { label: 'COGS', kind: 'change', valueK: -11 }, { label: 'OPS', kind: 'change', valueK: -8 }, { label: 'NET', kind: 'total' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <RungWaterfall data={observations} animate={animate} />;
}
