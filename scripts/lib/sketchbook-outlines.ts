import assert from 'node:assert/strict';
import { expect, type Browser } from '@playwright/test';

/** Check actual thumbnail pixels: valid SVG paths can still vanish after clipping and scaling. */
export async function checkSketchbookBarOutlines(browser: Browser, origin: string): Promise<void> {
  for (const deviceScaleFactor of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 650 }, deviceScaleFactor, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      for (const slug of ['sketch-bars', 'sketch-bars-horizontal', 'sketch-stacked-bars']) {
        await page.setContent(`<iframe title="Bar preview" src="${origin}/registry/languages/sketchbook/expressive/${slug}/index.html" style="position:absolute;left:12px;top:12px;width:720px;height:600px;border:0;transform-origin:top left"></iframe>`);
        const iframe = page.locator('iframe'); const frame = iframe.contentFrame();
        await expect(frame.locator('html')).toHaveAttribute('data-nx-ready', 'true');
        const bounds = frame.locator('[data-nx-sketch-bounds], [data-nx-sketch-rect]');
        await expect(bounds.first()).toBeVisible();
        await frame.locator('html').evaluate(async () => { await document.fonts.ready; });
        await expect(frame.locator('[data-nx-sketch-part="fillSketch"]').first()).toBeVisible();
        const boxes = await bounds.evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        }));
        // The small preview and half-pixel placement expose the original loss of top/bottom strokes.
        for (const scale of [1, 0.6, 0.45]) for (const phase of [0, 0.5]) {
          await iframe.evaluate((element, { scale, phase }) => {
            element.style.transform = `translate(${phase}px, ${phase}px) scale(${scale})`;
          }, { scale, phase });
          const position = await iframe.boundingBox(); assert(position);
          const screenshot = (await page.screenshot()).toString('base64');
          const coverage = await page.evaluate(async ({ screenshot, boxes, position, scale, deviceScaleFactor }) => {
            const image = new Image(); image.src = `data:image/png;base64,${screenshot}`; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
            const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
            const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const isInk = (x: number, y: number) => {
              const index = (y * width + x) * 4;
              const channels = [data[index]!, data[index + 1]!, data[index + 2]!];
              return Math.max(...channels) < 200 && Math.max(...channels) - Math.min(...channels) < 24;
            };
            return boxes.flatMap(box => [box.y, box.y + box.height].map(y => {
              const edgeY = (position.y + y * scale) * deviceScaleFactor;
              // Include the original roughness and antialiasing, without reaching far into the fill.
              const band = (1.5 * scale + 0.5) * deviceScaleFactor;
              let painted = 0;
              for (let sample = 0; sample < 40; sample++) {
                const x = Math.round((position.x + (box.x + box.width * (0.1 + sample / 39 * 0.8)) * scale) * deviceScaleFactor);
                for (let py = Math.floor(edgeY - band); py <= Math.ceil(edgeY + band); py++) {
                  if (isInk(x, py)) { painted++; break; }
                }
              }
              return painted / 40;
            }));
          }, { screenshot, boxes, position, scale, deviceScaleFactor });
          assert(coverage.every(value => value >= 0.85), `${slug}: missing top/bottom outline at scale ${scale}, phase ${phase}, DPR ${deviceScaleFactor}: ${coverage.join(', ')}`);
        }
      }
    } finally { await context.close(); }
  }
  console.log('Validated Sketchbook bar outlines in actual pixels at native and thumbnail scales, fractional placement and 1×/2× pixel density.');
}
