import { RangeCapsules, type RangeCapsulesDatum } from './component';

const observations: readonly RangeCapsulesDatum[] = [
  [195, 235], [165, 192], [150, 232], [73, 168], [122, 202], [182, 192], [138, 178],
  [162, 227], [195, 235], [228, 305], [218, 232], [165, 232], [118, 210], [195, 232],
].map(([lowK, highK], index) => ({ day: `${index + 1} FEB`, lowK: lowK!, highK: highK! }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <RangeCapsules data={observations} animate={animate} />;
}
