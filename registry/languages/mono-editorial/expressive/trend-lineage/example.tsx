import { TrendLineage, type TrendLineageDatum } from './component';

const features: readonly TrendLineageDatum[] = [
  { name: 'Dark mode', events: [{year: 2017, kind: 'shipped'}, {year: 2022, kind: 'reworked'}], alive: true },
  { name: 'Kanban', events: [{year: 2016, kind: 'shipped'}], alive: true },
  { name: 'Wikis', events: [{year: 2016, kind: 'shipped'}, {year: 2019, kind: 'reworked'}], alive: false },
  { name: 'Slash cmds', events: [{year: 2018, kind: 'shipped'}], alive: true },
  { name: 'Templates', events: [{year: 2019, kind: 'shipped'}, {year: 2024, kind: 'reworked'}], alive: true },
  { name: 'Inbox', events: [{year: 2020, kind: 'shipped'}], alive: false },
  { name: 'Live cursors', events: [{year: 2020, kind: 'shipped'}, {year: 2023, kind: 'reworked'}], alive: true },
  { name: 'AI drafts', events: [{year: 2023, kind: 'shipped'}, {year: 2025, kind: 'reworked'}], alive: true },
  { name: 'Voice notes', events: [{year: 2021, kind: 'shipped'}], alive: false },
  { name: 'Offline', events: [{year: 2018, kind: 'shipped'}, {year: 2026, kind: 'reworked'}], alive: true },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <TrendLineage data={features} years={[2016, 2026]} animate={animate} />;
}
