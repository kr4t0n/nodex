/**
 * THROWAWAY — generates tmp/verify.html, a contact sheet that iframes every
 * extracted component so the extraction can be eyeballed before the extractor
 * is deleted. The gallery app is Phase 4; this is the stopgap that stops Phases
 * 2 and 3 being built on a bad extraction.
 *
 * Usage: node tmp/make-verify.mjs   (run after scripts/build-registry.mjs)
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const registry = JSON.parse(
  await readFile(path.join(ROOT, 'public', 'r', 'registry.json'), 'utf8'),
);

const cards = registry.items
  .map((item) => {
    const { language, component, runtime, density, aspectRatio } = item.meta;
    const src = `../registry/languages/${language}/expressive/${item.name}/index.html`;
    const ratio = aspectRatio ? aspectRatio.replace('/', ' / ') : '4 / 3';
    return `  <figure class="cell">
    <figcaption>
      <b>${item.name}</b>
      <span>${component} · ${runtime}${density ? ` · ${density}` : ''}</span>
    </figcaption>
    <div class="frame" style="aspect-ratio:${ratio}">
      <iframe loading="lazy" title="${item.title.replace(/"/g, '&quot;')}" src="${src}"></iframe>
    </div>
  </figure>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>nodex — extraction contact sheet (${registry.items.length})</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    background: #17181a; color: #e6e7e9;
    font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  h1 { font-size: 15px; margin: 0 0 4px; letter-spacing: .04em; text-transform: uppercase; }
  p.lede { margin: 0 0 22px; color: #8d9096; font-size: 12px; }
  .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 20px; }
  .cell { margin: 0; }
  figcaption { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; padding: 0 2px 6px; }
  figcaption b { font-size: 12px; font-weight: 600; }
  figcaption span { font-size: 10.5px; color: #8d9096; letter-spacing: .02em; }
  .frame { border: 1px solid #2c2e31; border-radius: 10px; overflow: hidden; background: #F0EFEB; }
  iframe { width: 100%; height: 100%; border: 0; display: block; }
</style>
</head>
<body>
<h1>nodex extraction contact sheet</h1>
<p class="lede">${registry.items.length} components. Iframes are lazy — scroll to load. Each frame is the generated standalone preview, so what renders here is what the preview route will serve.</p>
<div class="sheet">
${cards}
</div>
</body>
</html>
`;

await writeFile(path.join(ROOT, 'tmp', 'verify.html'), html);
console.log(`wrote tmp/verify.html with ${registry.items.length} frames`);
