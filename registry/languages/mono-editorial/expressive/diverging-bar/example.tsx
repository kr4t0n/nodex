import { DivergingBar, type DivergingBarDatum } from './component';

const observations: readonly DivergingBarDatum[] = [
  { segment: 'Enterprise', netAccounts: 86 }, { segment: 'Team', netAccounts: 54 }, { segment: 'Pro', netAccounts: 31 },
  { segment: 'Starter', netAccounts: 12 }, { segment: 'Legacy Basic', netAccounts: -18 }, { segment: 'Trial expired', netAccounts: -42 },
  { segment: 'Free dormant', netAccounts: -67 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <DivergingBar data={observations} animate={animate} />;
}
