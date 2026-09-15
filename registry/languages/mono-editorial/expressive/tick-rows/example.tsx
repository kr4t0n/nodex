import { TickRows, type TickRowsDatum } from './component';
const teams: readonly TickRowsDatum[] = [
  { team: 'PLATFORM', releases: 34 }, { team: 'GROWTH', releases: 28 }, { team: 'MOBILE', releases: 22 },
  { team: 'INFRA', releases: 17 }, { team: 'ML', releases: 11 }, { team: 'DESIGN', releases: 8 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <TickRows data={teams} animate={animate} />;
}
