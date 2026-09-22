import { SoftGauge } from './component';

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftGauge data={{ value: 18, target: 24 }} unitLabel="Books" contextLabel="Your reading goal" height={364} animate={animate} />;
}
