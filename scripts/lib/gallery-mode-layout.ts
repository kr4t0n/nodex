import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Browser } from '@playwright/test';
import type { GalleryRegistry } from '../../packages/core/src/schema.ts';

/** Pin the old select's header footprint, including title-specific wrap points. */
export async function checkGalleryModeLayout(
  browser: Browser,
  origin: string,
  evidence: string,
) {
  const catalog = (await fetch(`${origin}/r/gallery.json`).then((response) =>
    response.json(),
  )) as GalleryRegistry;
  const charts = catalog.items.filter(
    (item) => item.meta.language === 'hearth',
  );
  // Measured in Chromium on base 84284e8 with Hearth's embedded font loaded.
  const controlWidths = { light: 81.1875, dark: 79.1875 };
  const controlHeight = 46;
  const results = [];
  const page = await browser.newPage({
    baseURL: origin,
    viewport: { width: 390, height: 900 },
    reducedMotion: 'reduce',
  });
  try {
    for (const item of charts) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`/l/hearth/${item.name}`);
      const mode = page.getByRole('switch', { name: 'Dark mode', exact: true });
      await expect(mode).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const heading = page.getByRole('heading', { level: 1 });
      const boundary = await heading.evaluate((title, width) => {
        const row = title.parentElement!;
        const gap = parseFloat(getComputedStyle(row).columnGap);
        return Math.ceil(
          title.getBoundingClientRect().width +
            gap +
            width +
            2 * row.getBoundingClientRect().x,
        );
      }, controlWidths.light);
      const widths = [
        ...new Set([
          320,
          360,
          375,
          390,
          393,
          412,
          414,
          1365,
          // Dark's label is 2px narrower; straddle both modes' wrap points.
          boundary - 3,
          boundary - 2,
          boundary - 1,
          boundary,
          boundary + 1,
        ]),
      ]
        .filter((width) => width >= 320)
        .sort((a, b) => a - b);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const selection of ['light', 'dark'] as const) {
          const controlWidth = controlWidths[selection];
          await mode.setChecked(selection === 'dark');
          const layout = await heading.evaluate((title) => {
            const row = title.parentElement!;
            const button = row.querySelector('[role="switch"]')!;
            return {
              title: title.getBoundingClientRect().toJSON(),
              row: row.getBoundingClientRect().toJSON(),
              control: button.getBoundingClientRect().toJSON(),
              gap: parseFloat(getComputedStyle(row).columnGap),
            };
          });
          const context = `${item.name}, ${width}px, ${selection}`;
          assert(Math.abs(layout.control.width - controlWidth) < 0.1, context);
          assert.equal(layout.control.height, controlHeight, context);
          const fits =
            layout.title.width + layout.gap + controlWidth <= layout.row.width;
          const height = fits
            ? Math.max(layout.title.height, controlHeight)
            : layout.title.height + layout.gap + controlHeight;
          assert(Math.abs(layout.row.height - height) < 0.1, context);
          results.push({ item: item.name, width, mode: selection, ...layout });
          if (
            width === 390 ||
            (width === 360 && item.name === 'hearth-bars') ||
            (width === 414 && item.name === 'hearth-shares')
          ) {
            await expect(
              page.locator('[data-nx-preview]').first(),
            ).toHaveAttribute('data-nx-preview-state', 'ready');
            await page.screenshot({
              path: path.join(
                evidence,
                `hearth-header-${item.name}-${selection}-${width}.png`,
              ),
            });
          }
        }
      }
    }
    await writeFile(
      path.join(evidence, 'hearth-header-layout.json'),
      JSON.stringify(
        { reference: '84284e8', controlWidths, controlHeight, results },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await page.close();
  }
}
