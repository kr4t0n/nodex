import { PairedRungs, type PairedRungsDatum } from './component';

const observations: readonly PairedRungsDatum[] = [
  { plan: 'FREE', beforeK: 31, afterK: 38 }, { plan: 'STARTER', beforeK: 22, afterK: 27 },
  { plan: 'PRO', beforeK: 16, afterK: 22 }, { plan: 'TEAM', beforeK: 13, afterK: 16 }, { plan: 'ENT', beforeK: 6, afterK: 9 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <PairedRungs data={observations} animate={animate} />;
}
