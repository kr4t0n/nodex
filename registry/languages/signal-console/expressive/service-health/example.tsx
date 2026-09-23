import { ServiceHealth, type ServiceHealthStatus } from './component';

const services = ['gateway', 'checkout', 'catalog', 'identity', 'payments', 'events', 'search'].map(id => ({ id, label: id }));
const windows = Array.from({ length: 12 }, (_, index) => ({ id: `window-${index}`, label: `13:${String(index * 5).padStart(2, '0')}` }));
const history = ['............', '....!!!.....', '............', '...........?', '....!xxx!...', '.........!..', '??..........'];
const status: Record<string, ServiceHealthStatus | null> = { '.': 'healthy', '!': 'degraded', x: 'down', '?': null };
const data = services.flatMap((service, row) => windows.map((window, column) => ({ serviceId: service.id, windowId: window.id, status: status[history[row]![column]!] ?? null })));

export function Example({ animate = true }: { animate?: boolean }) {
  return <ServiceHealth data={data} services={services} windows={windows} source="SERVICE CHECKS" window="12 × 5M WINDOWS" animate={animate} />;
}
