export type NocturneTone = 'a' | 'b' | 'c' | 'd';

/** Category identity survives sorting and insertion. Paint belongs to the chart. */
export function nocturneTone(id: string, explicit?: NocturneTone): NocturneTone {
  if (explicit && ['a', 'b', 'c', 'd'].includes(explicit)) return explicit;
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return (['a', 'b', 'c', 'd'] as const)[hash % 4]!;
}
