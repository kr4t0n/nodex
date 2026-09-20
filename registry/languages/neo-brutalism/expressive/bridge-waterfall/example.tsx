import { BridgeWaterfall, type BridgeWaterfallDatum } from './component';
const steps: readonly BridgeWaterfallDatum[] = [
  { id: 'opening', label: 'Opening', kind: 'start', value: 120 },
  { id: 'new', label: 'New', kind: 'change', value: 64 },
  { id: 'expansion', label: 'Expansion', kind: 'change', value: 28 },
  { id: 'churn', label: 'Churn', kind: 'change', value: -32 },
  { id: 'credits', label: 'Credits', kind: 'change', value: -16 },
  { id: 'closing', label: 'Closing', kind: 'total' },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <BridgeWaterfall data={steps} unitLabel="Revenue · $K" contextLabel="Monthly bridge" animate={animate} />;
}
