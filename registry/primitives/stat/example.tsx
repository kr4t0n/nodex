import { Stat, StatGroup } from './component';

export function Example() {
  return (
    <div className="flex w-full flex-col gap-[26px]">
      <StatGroup variant="ruled">
        <Stat label="Peak concurrent" value="208" unit="k" delta={{ direction: 'up', label: '4.2% on last quarter', strong: true }} />
        <Stat label="Median reply" value="1.9" unit="h" delta={{ direction: 'down', label: '18 min faster' }} />
        <Stat label="Deploys" value="312" delta={{ direction: 'flat', label: 'unchanged' }} />
      </StatGroup>
      <Stat label="Quarter to date" value="$1,060" unit="k" size="lg" note="Across 2,103 paying accounts on four plans." />
    </div>
  );
}
