import { BrandSpectrum, type BrandSpectrumDatum } from './component';

const observations: readonly BrandSpectrumDatum[] = [
  { left: 'FRIEND', right: 'AUTHORITY', us: 0.74, competitors: [0.42, 0.52, 0.57] },
  { left: 'SERIOUS', right: 'PLAYFUL', us: 0.8, competitors: [0.6, 0.65, 0.86] },
  { left: 'RELIABLE', right: 'RISK-TAKING', us: 0.4, competitors: [0.3, 0.34, 0.5] },
  { left: 'CONTEMPORARY', right: 'CLASSIC', us: 0.22, competitors: [0.36, 0.41, 0.73] },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <BrandSpectrum data={observations} animate={animate} />;
}
