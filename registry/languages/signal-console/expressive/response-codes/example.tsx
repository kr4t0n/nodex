import { ResponseCodes } from './component';

const counts = [
  [1080, 42, 28, 4], [1210, 38, 32, 6], [1160, 46, 24, 8], [1340, 50, 44, 12],
  [1290, 48, 38, 5], [1410, 54, 52, 18], [1560, 62, 74, 96], [1480, 58, 88, 182],
  [1390, 52, 61, 124], [1510, 46, 42, 38], [1620, 56, 36, 12], [1570, 44, 30, 8],
] as const;
const data = counts.map(([success, redirect, clientError, serverError], index) => ({ id: `window-${index}`, label: `12:${String(index * 5).padStart(2, '0')}`, success, redirect, clientError, serverError }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <ResponseCodes data={data} source="HTTP GATEWAY" window="12 × 5M WINDOWS" animate={animate} />;
}
