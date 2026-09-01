/**
 * Render an ECharts option to SVG with no DOM. Build tooling, never shipped.
 *
 * This lives in `scripts/` rather than beside the components because nothing a
 * consumer receives calls it: the build uses it to generate static previews,
 * and the conformance lint uses it to read the marks a chart actually draws
 * rather than parsing them out of source. Source parsing is what let five
 * components ship a 2px stroke hidden inside a ternary.
 *
 * That reading is only possible because charts render as SVG. ECharts defaults
 * to canvas, which leaves nothing in the DOM to inspect — no elements, no
 * stroke widths, no colours — so a canvas chart is unlintable by construction.
 * Every chart in the registry sets `renderer: 'svg'` for that reason.
 */
import * as echarts from 'echarts';

export function renderToSVG(option, { width, height }) {
  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width,
    height,
  });
  // `finally`, not a trailing call: disposing matters most when the render
  // throws. An undisposed SSR instance keeps a handle open and the Node process
  // never exits, so a chart that fails to draw hangs the build *instead of*
  // reporting the error — which is how a visualMap crash cost an hour before
  // anyone saw the stack trace. Same shape as the jsdom timers that hang the
  // smoke test.
  try {
    chart.setOption(option);
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}
