import { RadialConvergence, type RadialConvergenceDatum, type RadialConvergenceTheme } from './component';
const themes: readonly RadialConvergenceTheme[] = [
  { id: 'perf', name: 'PERF', degrees: 75 }, { id: 'integrations', name: 'INTEGRATIONS', degrees: 3 }, { id: 'pricing', name: 'PRICING', degrees: -69 }, { id: 'mobile', name: 'MOBILE', degrees: -141 }, { id: 'ux', name: 'UX', degrees: -213 },
];
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const blocks = [15, 10, 9, 8, 6].flatMap((count, index) => Array<number>(count).fill(index));
const data: readonly RadialConvergenceDatum[] = Array.from({ length: 48 }, (_, index) => ({ id: `R-${String(index + 1).padStart(2, '0')}`, themeId: themes[random(index + 1, 11) > 0.92 ? (blocks[index]! + 2) % themes.length : blocks[index]!]!.id }));
export function Example() { return <RadialConvergence data={data} themes={themes} />; }
