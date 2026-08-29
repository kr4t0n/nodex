import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

/**
 * Mount an ECharts option onto an element, and clean up after it.
 *
 * Shipped once by `nodex init` rather than inlined per component, the way
 * shadcn ships `lib/utils`. A React registry can have a shared hook without the
 * problems a shared file caused the framework-free version: this is the only
 * imperative code in the whole registry, every chart needs exactly it, and a
 * hook is what a React consumer expects to find.
 *
 * **The SVG renderer is not a preference.** ECharts defaults to canvas, and a
 * canvas leaves nothing in the DOM to inspect — no elements, no stroke widths,
 * no colours. Conformance would then have to be checked by parsing source,
 * which is the approach whose blind spot let five components ship a 2px stroke
 * inside a ternary. Rendering to SVG keeps every mark readable by `nodex lint`
 * and by anyone with dev tools open.
 *
 * `option` is a dependency, so memoise it in the caller or the chart tears down
 * and rebuilds on every render.
 */
export function useECharts<T extends HTMLElement>(option: EChartsOption) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);

    // ResizeObserver rather than a window listener: a chart in a resizable
    // panel or a grid cell changes size without the window doing anything.
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

/**
 * The same option, rendered to an SVG string without a DOM.
 *
 * Used by the build to generate previews as static files, and by the
 * conformance lint to read the marks a chart actually draws. Keeping this
 * beside the hook is what stops the two paths diverging: a preview and a lint
 * both see exactly what a browser would.
 */
export function renderToSVG(
  option: EChartsOption,
  size: { width: number; height: number },
): string {
  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: size.width,
    height: size.height,
  });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}
