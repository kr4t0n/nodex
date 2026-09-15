import { LaunchFan, type LaunchFanDatum } from './component';
const launches: readonly LaunchFanDatum[] = [
  { feature: 'Editor', week: 1 }, { feature: 'Boards', week: 3 }, { feature: 'Docs', week: 4 }, { feature: 'Chat', week: 6 },
  { feature: 'Flows', week: 8 }, { feature: 'Vault', week: 9 }, { feature: 'Pages', week: 11 }, { feature: 'Sync', week: 12 },
  { feature: 'Grid', week: 14 }, { feature: 'Views', week: 16 }, { feature: 'Hub', week: 17 }, { feature: 'Forms', week: 19 },
];
export function Example({ animate = true }: { animate?: boolean }) { return <LaunchFan data={launches} guideWeeks={[5, 10, 15, 20]} animate={animate} />; }
