import { HearthDumbbell, type HearthDumbbellDatum } from './component';

const data: HearthDumbbellDatum[] = [
  { id: 'risotto', label: 'Mushroom risotto', start: 55, end: 35 },
  { id: 'pastry', label: 'Shortcrust pastry', start: 48, end: 22 },
  { id: 'dal', label: 'Red lentil dal', start: 40, end: 28 },
  { id: 'focaccia', label: 'Rosemary focaccia', start: 35, end: 25 },
  { id: 'omelette', label: 'French omelette', start: 12, end: 6 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthDumbbell
      data={data}
      startLabel="First time"
      endLabel="Tenth time"
      unitLabel="First time, tenth time"
      contextLabel="Hands-on minutes"
      valueFormatter={(value) => `${value} min`}
      aria-label="Illustrative hands-on minutes for five recipes, first and tenth attempt"
      animate={animate}
    />
  );
}
