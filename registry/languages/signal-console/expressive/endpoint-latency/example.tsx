import { EndpointLatency } from './component';

const endpoints = [
  { route: 'POST /checkout', p99Ms: 812, rps: 340 },
  { route: 'GET  /search', p99Ms: 604, rps: 1290 },
  { route: 'POST /orders', p99Ms: 486, rps: 720 },
  { route: 'GET  /cart', p99Ms: 318, rps: 2140 },
  { route: 'POST /auth/token', p99Ms: 274, rps: 980 },
  { route: 'GET  /catalog', p99Ms: 196, rps: 3400 },
  { route: 'GET  /profile', p99Ms: 142, rps: 610 },
  { route: 'POST /events', p99Ms: 118, rps: 5200 },
  { route: 'GET  /health', p99Ms: 46, rps: 8800 },
  { route: 'GET  /assets', p99Ms: 28, rps: 12400 },
] as const;

export function Example({ animate = true }: { animate?: boolean }) {
  return <EndpointLatency data={endpoints} objectiveMs={300} source="EDGE GATEWAY" window="5M WINDOW" updated="UPDATED 0S AGO" animate={animate} aria-label="Gateway routes ranked by p99 latency" />;
}
