import { TypeColonnade, type TypeColonnadeDatum } from './component';

const teams = ['PLATFORM', 'FRONTEND', 'BACKEND', 'DATA', 'INFRA', 'MOBILE', 'SECURITY', 'GROWTH', 'ML', 'DESIGN'];
const prefixes = ['core', 'ui', 'api', 'data', 'auth', 'sync', 'mail', 'flag', 'edge', 'doc', 'bot'];
const suffixes = ['-kit', '-svc', '-web', '-cli', '-db', '-gw', '-sdk', '-jobs'];
const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const ownership: readonly TypeColonnadeDatum[] = Array.from({ length: 44 }, (_, i) => {
  const w = rnd(i + 1, 17);
  return { repo: (prefixes[i % prefixes.length] ?? '') + (suffixes[Math.floor(rnd(i + 1, 8) * suffixes.length) % suffixes.length] ?? '') + (i > 21 ? '-v2' : ''),
    team: Math.min(teams.length - 1, Math.floor(w * w * teams.length)) };
});
export function Example({ animate = true }: { animate?: boolean }) {
  return <TypeColonnade data={ownership} teams={teams} animate={animate} />;
}
