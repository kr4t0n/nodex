/** A finite native axis domain, including a readable extent for a single coordinate. */
export function numericDomain(values: readonly number[]): [number, number] | null {
  if (!values.length) return [0, 1];
  let low = Infinity; let high = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) return null;
    low = Math.min(low, value); high = Math.max(high, value);
  }
  if (low === high) {
    const padding = Math.max(1, Math.abs(low) * 0.05);
    low -= padding; high += padding;
  }
  return Number.isFinite(low) && Number.isFinite(high) && Number.isFinite(high - low) ? [low, high] : null;
}
