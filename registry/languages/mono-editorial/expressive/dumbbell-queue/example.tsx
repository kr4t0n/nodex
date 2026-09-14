import { DumbbellQueue, type DumbbellQueueDatum } from './component';
const steps: readonly DumbbellQueueDatum[] = [
  { step: 'INVITE FLOW', beforeMinutes: 14, afterMinutes: 6 },
  { step: 'FIRST BOARD', beforeMinutes: 19, afterMinutes: 9 },
  { step: 'IMPORT DATA', beforeMinutes: 26, afterMinutes: 13 },
  { step: 'TEAM SETUP', beforeMinutes: 31, afterMinutes: 21 },
  { step: 'GO LIVE', beforeMinutes: 38, afterMinutes: 30 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <DumbbellQueue data={steps} animate={animate} />;
}
