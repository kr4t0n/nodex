import { BarRace, type BarRaceFrame, type BarRaceProduct } from './component';
const products: readonly BarRaceProduct[] = ['Editor', 'Boards', 'Docs', 'Chat', 'Flows', 'Vault', 'Pages', 'Sync'].map(name => ({ id: name, name }));
const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const texture = (i: number, k: number) => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const frames: readonly BarRaceFrame[] = (() => {
  let revenue: readonly number[] = [42, 38, 30, 26, 18, 14, 10, 8];
  return years.map((year, index) => {
    if (index > 0) revenue = revenue.map((value, product) => value * (1.04 + texture(product + 1, index + 1) * 0.5));
    return { period: String(year), revenueK: revenue };
  });
})();
export function Example({ animate = true }: { animate?: boolean }) { return <BarRace data={frames} products={products} animate={animate} />; }
