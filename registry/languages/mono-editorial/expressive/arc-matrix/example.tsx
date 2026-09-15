import { ArcMatrix, type ArcMatrixDatum } from './component';

const cities = ['SF', 'NYC', 'LON', 'BER', 'TOK', 'SYD', 'SIN', 'PAR', 'AMS', 'TOR', 'SEO', 'SAO'];
const products = ['Editor', 'Boards', 'Docs', 'Flows', 'Chat', 'Vault', 'Pages', 'Sync'];
const weights = [9, 8, 7, 7, 6, 5, 5, 4, 4, 3, 3, 2];
const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

// The original specimen's accounts, moved out of the production component.
const accounts: ArcMatrixDatum[] = products.flatMap((product, row) => cities.map((city, column) => ({
  product,
  city,
  value: rnd(row * 13 + 1, column * 7 + 3) < 0.09 ? 0 : Math.min(40, Math.round(
    (weights[column] ?? 0) * 3.4 * (1 - row * 0.085) * (0.45 + rnd(row + 1, column + 1) * 0.85),
  )),
})));

export function Example({ animate = true }: { animate?: boolean }) {
  return <ArcMatrix data={accounts} animate={animate} aria-label="Active accounts across eight products and twelve cities" />;
}
