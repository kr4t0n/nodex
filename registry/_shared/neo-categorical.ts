/** Stable category identity only. Language-specific paint stays with each chart. */
export type NeoCategoryTone = 'a' | 'b' | 'c' | 'd';

export function neoCategoryTone(id: string, tone?: NeoCategoryTone): NeoCategoryTone {
  if (tone) return tone;
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return (['a', 'b', 'c', 'd'] as const)[(hash >>> 0) % 4]!;
}
