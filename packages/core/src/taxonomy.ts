/**
 * The universal component type vocabulary.
 *
 * A component carries two names: its slug, which is the design language's own
 * word for it (`rung-bars`), and its type, which is the cross-language join key
 * (`bar`). The slug is what you type; the type is what makes "the bar chart in
 * language X" answerable.
 *
 * Governing rule: a type names the mark and encoding, never the animation or the
 * data domain. Otherwise `bar-race`, `dynamic-data`, and `draw-in-counter`
 * become types instead of a bar and two lines carrying motion tags.
 */
export const COMPONENT_TYPES = [
  'area',
  'bar',
  'beeswarm',
  'boxplot',
  'bubble',
  'bump',
  'calendar-heatmap',
  'candlestick',
  'choropleth',
  'diverging-bar',
  'donut',
  'dot-matrix',
  'dot-plot',
  'dumbbell',
  'funnel',
  'gauge',
  'grouped-bar',
  'heatmap',
  'histogram',
  'interval-dot',
  'line',
  'lollipop',
  'network',
  'paired-range',
  'parallel-coordinates',
  'pictorial-bar',
  'pie',
  'polar-area',
  'radial-plot',
  'range-bar',
  'ridgeline',
  'sankey',
  'scatter',
  'stacked-bar',
  'streamgraph',
  'strip-plot',
  'trajectory',
  'tree',
  'treemap',
  'unit-chart',
  'violin',
  'waterfall',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

/**
 * Primitives are not chart types, so they get their own vocabulary.
 *
 * A type belongs here when a design language changes only its paint, never its
 * form: a button is a button everywhere, and only its colour, radius, and stroke
 * differ. Anything whose geometry the language determines is expressive instead.
 * A slider over a distribution, for example, is a chart with a control on it.
 */
export const PRIMITIVE_TYPES = [
  'alert',
  'avatar',
  'badge',
  'button',
  'card',
  'checkbox',
  'code',
  'details',
  'dialog',
  'empty-state',
  'input',
  'link',
  'progress',
  'prose',
  'radio',
  'rule',
  'select',
  'slider',
  'stat',
  'status',
  'switch',
  'table',
  'textarea',
  'tooltip',
] as const;

export type PrimitiveType = (typeof PRIMITIVE_TYPES)[number];

/** React is the delivery runtime. A chart's library is declared separately. */
export const RUNTIMES = ['react'] as const;

export type Runtime = (typeof RUNTIMES)[number];

export function isComponentType(value: string): value is ComponentType {
  return (COMPONENT_TYPES as readonly string[]).includes(value);
}

export function isPrimitiveType(value: string): value is PrimitiveType {
  return (PRIMITIVE_TYPES as readonly string[]).includes(value);
}
