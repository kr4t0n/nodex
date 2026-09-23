/** Category identity shared by bars and donut; paint belongs to each language component. */
export type StudioTone = 'a' | 'b' | 'c' | 'd';

export function studioTone(id: string, tone?: StudioTone): StudioTone {
  if (tone && ['a', 'b', 'c', 'd'].includes(tone)) return tone;
  let hash = 0;
  for (const character of id) hash = Math.imul(hash, 31) + character.codePointAt(0)!;
  return (['a', 'b', 'c', 'd'] as const)[(hash >>> 0) % 4]!;
}
