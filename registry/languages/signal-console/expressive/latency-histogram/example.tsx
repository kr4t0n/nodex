import { LatencyHistogram } from './component';

const data = [38, 172, 416, 680, 910, 750, 496, 311, 215, 160, 91, 45, 24, 14, 6, 2].map(count => ({ count }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <LatencyHistogram data={data} bucketWidthMs={40} objectiveMs={300} source="CHECKOUT API" window="5M WINDOW" animate={animate} />;
}
