import { NocturneScatterMatrix, type NocturneMatrixCohort, type NocturneMatrixDatum, type NocturneMatrixDimension } from './component';

const dimensions: NocturneMatrixDimension[] = [
  { id: 'throughput', label: 'Throughput', unit: 'req/s' },
  { id: 'latency', label: 'Latency', unit: 'ms' },
  { id: 'cpu', label: 'CPU load', unit: '%' },
  { id: 'errors', label: 'Error rate', unit: '%' },
];
const cohorts: NocturneMatrixCohort[] = [{ id: 'current', label: 'Current release', tone: 'a' }, { id: 'candidate', label: 'Candidate', tone: 'b' }];
// Deterministic illustrative observations, not a fitted model or a production dataset.
const data: NocturneMatrixDatum[] = cohorts.flatMap((cohort, group) => Array.from({ length: 24 }, (_, index) => {
  const load = 180 + index * 24; const variation = [3, -5, 8, -2, 5, -7][index % 6]!;
  return { id: cohort.id + '-' + index, label: cohort.label + ' · window ' + (index + 1), cohortId: cohort.id,
    values: { throughput: load + variation * 3, latency: Math.round(30 + load * (group ? 0.054 : 0.085) + Math.max(0, load - 540) ** 2 / (group ? 3400 : 1800) + variation),
      cpu: Math.round(13 + load * (group ? 0.063 : 0.088) + variation / 2), errors: Math.round(Math.max(0, 0.08 + Math.max(0, load - (group ? 580 : 430)) * 0.004 + variation * 0.018) * 100) / 100 } };
}));

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneScatterMatrix data={data} dimensions={dimensions} cohorts={cohorts} binCount={6}
    unitLabel="What moves together?" contextLabel="Illustrative · 5-minute windows" height={886} animate={animate} />;
}
