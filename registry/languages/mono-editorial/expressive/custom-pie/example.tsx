import { CustomPie, type CustomPieDatum } from './component';
const surfaces: readonly CustomPieDatum[] = [
  { surface: 'Editor', sharePct: 34, minutes: 42 }, { surface: 'Boards', sharePct: 22, minutes: 31 },
  { surface: 'Docs', sharePct: 18, minutes: 38 }, { surface: 'Chat', sharePct: 12, minutes: 11 },
  { surface: 'Automations', sharePct: 8, minutes: 24 }, { surface: 'Other', sharePct: 6, minutes: 7 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <CustomPie data={surfaces} scaleMinutes={45} referenceMinutes={[15, 30, 45]} animate={animate} />;
}
