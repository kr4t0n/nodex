import { DynamicData, type DynamicDataDatum } from './component';
const texture = (i: number, k: number) => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const samples: readonly DynamicDataDatum[] = (() => {
  let value = 64;
  return Array.from({ length: 50 }, (_, index) => {
    value = Math.max(30, value + (texture(index + 1, 7) - 0.48) * 9);
    return { sample: String(index), usersK: Math.round(value) };
  });
})();
export function Example({ animate = true }: { animate?: boolean }) { return <DynamicData data={samples} sourceStatus="LIVE" animate={animate} />; }
