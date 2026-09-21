import { TraceSpans, type TraceSpanDatum } from './component';

const data: TraceSpanDatum[] = [
  { id: 'request', label: 'POST /checkout', startMs: 0, endMs: 812, outcome: 'error' },
  { id: 'auth', label: 'auth.verify', startMs: 4, endMs: 45, outcome: 'ok' },
  { id: 'cache', label: 'session.get', startMs: 38, endMs: 60, outcome: 'ok' },
  { id: 'catalog', label: 'catalog.fetch', startMs: 70, endMs: 170, outcome: 'ok' },
  { id: 'inventory', label: 'inventory.reserve', startMs: 180, endMs: 486, outcome: 'ok' },
  { id: 'tax', label: 'tax.calculate', startMs: 180, endMs: 238, outcome: 'ok' },
  { id: 'payment', label: 'payment.authorize', startMs: 500, endMs: 768, outcome: 'error' },
  { id: 'rollback', label: 'inventory.release', startMs: 774, endMs: 803, outcome: 'ok' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <TraceSpans data={data} source="TRACE / 7B2F91" window="OFFSETS FROM REQUEST START" animate={animate} />;
}
