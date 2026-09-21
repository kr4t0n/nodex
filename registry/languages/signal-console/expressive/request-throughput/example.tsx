import { RequestThroughput } from './component';

const rates = [1820, 1960, 1880, 2240, 2180, 2050, 2320, 2690, 2580, 2820, 3060, 2940, 3210, 3480, 3270, 3020, 2890, 3140, 3380, 3160, 2970, 2840, 3090, 3260];
const data = rates.map((requestsPerSecond, index) => ({ id: `minute-${index}`, label: `12:${String(index).padStart(2, '0')}`, requestsPerSecond }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <RequestThroughput data={data} source="EDGE GATEWAY" window="24 × 1M WINDOWS" animate={animate} />;
}
