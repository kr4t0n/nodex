import { Candlestick, type CandlestickDatum } from './component';
const texture = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const days: readonly CandlestickDatum[] = (() => {
  let price = 52;
  return Array.from({ length: 30 }, (_, day) => {
    const drift = day < 10 ? 0.4 : day < 18 ? -1.5 : 1.3; const open = price;
    const close = Math.max(30, open + drift + (texture(day + 1, 3) - 0.5) * 4.6);
    const high = Math.max(open, close) + texture(day + 2, 7) * 2.6; const low = Math.min(open, close) - texture(day + 3, 11) * 2.6;
    price = close; return { day: `Day ${day + 1}`, open, close, low, high };
  });
})();
export function Example({ animate = true }: { animate?: boolean }) { return <Candlestick data={days} animate={animate} />; }
