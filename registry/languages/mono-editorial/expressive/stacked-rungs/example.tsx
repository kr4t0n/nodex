import { StackedRungs, type StackedRungsDatum } from './component';

const observations: readonly StackedRungsDatum[] = [
  { region: 'NA', coreK: 18, addOnsK: 11, servicesK: 7 }, { region: 'EU', coreK: 14, addOnsK: 9, servicesK: 5 },
  { region: 'APAC', coreK: 9, addOnsK: 7, servicesK: 6 }, { region: 'LATAM', coreK: 5, addOnsK: 4, servicesK: 2 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <StackedRungs data={observations} animate={animate} />;
}
