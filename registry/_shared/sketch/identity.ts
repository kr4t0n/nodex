export type SketchTone = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i';

/** Positive, stable seeds keep decoration tied to identity, not array order. */
export function sketchSeed(id: string): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return 1 + (hash >>> 0) % 2147483646;
}
export function uniqueIds(items: readonly { id: string }[]): boolean {
  return items.every(item => typeof item.id === 'string' && item.id.trim().length > 0)
    && new Set(items.map(item => item.id)).size === items.length;
}
export const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export const nonnegative = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

export function numericDomain(values: readonly number[]): [number, number] {
  const min = Math.min(...values); const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  const padding = min === max ? Math.max(1, Math.abs(min) * 0.1) : (max - min) * 0.06;
  return [min - padding, max + padding];
}
