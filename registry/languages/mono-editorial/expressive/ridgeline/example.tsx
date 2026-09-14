import { Ridgeline, type RidgelineDatum } from './component';

const pipelines = [['MOBILE', 3.2, 1.3], ['DESKTOP', 5.1, 1.9], ['API', 7.4, 2.3], ['IMPORTS', 10.8, 3.2], ['BATCH', 15.2, 4]] as const;
const data: RidgelineDatum[] = pipelines.map(([pipeline, centre, spread]) => {
  const density = Array.from({ length: 72 }, (_, k) => {
    const hours = k / 71 * 24;
    return { hours, density: Math.exp(-((hours - centre) ** 2) / (2 * spread * spread)) + 0.26 * Math.exp(-((hours - centre * 2.1) ** 2) / (2 * (spread * 1.7) ** 2)) };
  });
  const maximum = Math.max(...density.map((point) => point.density));
  return { pipeline, density: density.map((point) => ({ ...point, density: point.density / maximum })) };
});

export function Example() { return <Ridgeline data={data} />; }
