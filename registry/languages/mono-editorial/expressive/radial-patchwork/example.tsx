import { RadialPatchwork, type RadialPatchworkDatum } from './component';
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const incidents = new Set([4, 17, 31]);
const data: readonly RadialPatchworkDatum[] = Array.from({ length: 46 }, (_, index) => {
  const peak = random(index + 1, 2) > 0.5 ? 11 : 16;
  return { hour: (peak + (random(index + 1, 3) - 0.5) * 7 + 24) % 24, spanDegrees: 10 + random(index + 1, 4) * 34, filesTouched: (34 + random(index + 1, 5) * 100) * 6, paged: incidents.has(index) };
});
export function Example() { return <RadialPatchwork data={data} />; }
