import { DonutRedesigned, type DonutRedesignedDatum } from './component';
const sources: readonly DonutRedesignedDatum[] = [
  { source: 'Search', percent: 34 }, { source: 'Referral', percent: 27 }, { source: 'Social', percent: 18 },
  { source: 'Partners', percent: 12 }, { source: 'Paid', percent: 9 },
];
export function Example({ animate = true }: { animate?: boolean }) { return <DonutRedesigned data={sources} animate={animate} />; }
