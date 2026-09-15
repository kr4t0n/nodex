import { DotCascade, type DotCascadeDatum } from './component';
const causes: readonly DotCascadeDatum[] = [
  { cause: 'DNS', incidents: 1 }, { cause: 'CDN', incidents: 1 }, { cause: 'QUOTA', incidents: 2 }, { cause: 'DISK', incidents: 3 },
  { cause: 'CERT', incidents: 3 }, { cause: 'CACHE', incidents: 4 }, { cause: 'QUEUE', incidents: 5 }, { cause: 'LOCK', incidents: 6 },
  { cause: 'OOM', incidents: 7 }, { cause: 'NET', incidents: 9 }, { cause: '3P API', incidents: 11 }, { cause: 'CONFIG', incidents: 13 },
  { cause: 'DB', incidents: 15 }, { cause: 'DEPLOY', incidents: 18 }, { cause: 'CODE', incidents: 22 }, { cause: 'HUMAN', incidents: 27 },
];
export function Example({ animate = true }: { animate?: boolean }) { return <DotCascade data={causes} animate={animate} />; }
