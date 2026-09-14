import { TickGauge } from './component';
export function Example({ animate = true }: { animate?: boolean }) {
  return <TickGauge data={{ percent: 73, goalLabel: 'OF THE ANNUAL GOAL' }} animate={animate} />;
}
