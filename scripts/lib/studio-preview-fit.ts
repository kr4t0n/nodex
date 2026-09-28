import { checkChartPreviewFit } from './chart-preview-fit.ts';
import { expect, type Locator } from '@playwright/test';

/** A surface can fit perfectly while its responsive chart has collapsed to zero. */
export async function checkStudioGaugeGeometry(chart: Locator): Promise<void> {
  await expect(chart.locator('[data-nx-soft-gauge-arc]')).toHaveCount(2);
  await expect.poll(() => chart.evaluate(root => {
    const svg = root.querySelector('svg.recharts-surface')?.getBoundingClientRect();
    const arcs = [...root.querySelectorAll('[data-nx-soft-gauge-arc]')].map(e => e.getBoundingClientRect());
    const value = root.querySelector('[data-nx-soft-gauge-percent]')?.getBoundingClientRect();
    const reading = root.querySelector('[data-nx-soft-gauge-reading]')?.getBoundingClientRect();
    const minimum = root.querySelector('[data-nx-soft-gauge-min]')?.getBoundingClientRect();
    const maximum = root.querySelector('[data-nx-soft-gauge-max]')?.getBoundingClientRect();
    if (!svg || !value || !reading || !minimum || !maximum) return false;
    const center = svg.left + svg.width / 2;
    return svg.width > 0 && svg.height > 0 && arcs.length === 2 && arcs.every(arc => arc.width > 1 && arc.height > 1)
      && Math.abs(value.left + value.width / 2 - center) < 1
      && Math.abs(reading.left + reading.width / 2 - center) < 1
      && value.bottom <= reading.top + 1 && minimum.right < value.left && maximum.left > value.right
      && [value, reading, minimum, maximum, ...arcs].every(box => box.left >= svg.left - 1 && box.right <= svg.right + 1 && box.top >= svg.top - 1 && box.bottom <= svg.bottom + 1);
  }), { message: 'Gauge arcs must be visible, readings centered and limits separated inside the measured chart' }).toBe(true);
}

export async function checkStudioPreviewFit(chart: Locator): Promise<void> {
  if (await chart.getAttribute('data-nx-chart') === 'soft-gauge') await checkStudioGaugeGeometry(chart);
  await checkChartPreviewFit(chart);
}
