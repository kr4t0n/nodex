import { StreamRibbon, type StreamRibbonDatum } from './component';
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const trace = (base: number, trend: number, long: number, short: number, seed: number) => Array.from({ length: 48 }, (_, t) => Math.max(2, base + trend * t + 10 * Math.sin(t / long + seed) + 5 * Math.sin(t / short + seed * 2) + random(t + 1, seed) * 6));
const data: readonly StreamRibbonDatum[] = [{ name: 'LEGACY EDITOR', weekly: trace(46, -0.62, 9, 3.7, 2), tone: 'faint' }, { name: 'BOARDS', weekly: trace(26, 0.1, 11, 4.2, 5), tone: 'muted' }, { name: 'FLOWS', weekly: trace(12, 0.78, 10, 3.1, 8), tone: 'ink' }];
const weeks = Array.from({ length: 48 }, (_, index) => `W${index + 1}`);
export function Example() { return <StreamRibbon data={data} weeks={weeks} height={256} />; }
