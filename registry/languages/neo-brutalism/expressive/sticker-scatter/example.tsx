import { StickerScatter, type StickerScatterDatum } from './component';
const campaigns: readonly StickerScatterDatum[] = [
  { id: 'launch', label: 'Product launch', x: 18, y: 3.2, tone: 'a' },
  { id: 'newsletter', label: 'Newsletter', x: 28, y: 6.8, tone: 'b' },
  { id: 'social', label: 'Social series', x: 46, y: 4.4, tone: 'd' },
  { id: 'partner', label: 'Partner event', x: 38, y: 8.2, tone: 'c' },
  { id: 'video', label: 'Studio video', x: 64, y: 7.1, tone: 'a' },
  { id: 'community', label: 'Community', x: 54, y: 10.4, tone: 'b' },
  { id: 'guide', label: 'Field guide', x: 78, y: 9.1, tone: 'c' },
  { id: 'release', label: 'Major release', x: 92, y: 12.2, tone: 'd' },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <StickerScatter data={campaigns} xLabel="Reach · thousands" yLabel="Engagement · %" contextLabel="Campaign performance" animate={animate} />;
}
