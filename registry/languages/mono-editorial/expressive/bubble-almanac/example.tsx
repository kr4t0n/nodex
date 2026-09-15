import { BubbleAlmanac, type BubbleAlmanacDatum, type BubbleAlmanacAnnotation } from './component';
const areas = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT', 'PAGES', 'SYNC', 'GRID', 'VIEWS', 'HUB', 'FORMS'];
const years = Array.from({ length: 8 }, (_, index) => String(2019 + index));
const born = [2019, 2019, 2019, 2020, 2020, 2021, 2021, 2022, 2022, 2023, 2024, 2024];
const betaUntil: Record<number, number> = { 8: 2023, 9: 2024, 10: 2025, 11: 2025 };
const random = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const data: readonly BubbleAlmanacDatum[] = years.flatMap((year, yearIndex) => areas.flatMap((_, areaIndex) => {
  if (Number(year) < born[areaIndex]!) return [];
  const age = Number(year) - born[areaIndex]!; const count = Math.round((2 + age * 5) * (0.25 + random(yearIndex * 12 + areaIndex + 1, areaIndex + 3) ** 2 * 2.2));
  return { yearIndex, areaIndex, tickets: Math.max(1, count) * 10, beta: betaUntil[areaIndex] !== undefined && Number(year) <= betaUntil[areaIndex]! };
}));
const events = [{ year: '2020', note: 'SLA introduced' }, { year: '2022', note: 'self-serve help center' }, { year: '2023', note: 'the GA wave' }, { year: '2025', note: 'AI deflection live' }];
const annotations: readonly BubbleAlmanacAnnotation[] = [
  { from: [3 + 30 / 57, 5 - 14 / 34], to: [3 + 118 / 57, 5 - 38 / 34], text: 'chat tickets triple after mobile GA' },
  { from: [9 + 16 / 57, 2 + 8 / 34], to: [9 + 80 / 57, 2 + 30 / 34], text: 'betas barely ticket — nobody files bugs on toys' },
];
// The original static specimen pins its 540 × 245 plot below the live component's minimum.
export function Example() { return <BubbleAlmanac data={data} years={years} areas={areas} events={events} annotations={annotations} height={293} />; }
