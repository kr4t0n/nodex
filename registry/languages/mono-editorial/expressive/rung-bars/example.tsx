import { RungBars, type RungBarsDatum } from './component';

const observations: readonly RungBarsDatum[] = [
  { plan: 'FREE', mrrK: 38 }, { plan: 'STARTER', mrrK: 27 }, { plan: 'PRO', mrrK: 22 },
  { plan: 'TEAM', mrrK: 16 }, { plan: 'SCALE', mrrK: 11 }, { plan: 'ENT', mrrK: 7 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <RungBars data={observations} animate={animate} />;
}
