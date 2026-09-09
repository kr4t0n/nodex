import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

import type { Page } from '@playwright/test';

import type { RenderedMark } from '../../packages/cli/src/lint.ts';

/** Local-only static hosting for build and test artifacts. */
export async function serveDirectory(directory: string) {
  const root = path.resolve(directory);
  const mime: Record<string, string> = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
      if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
      const info = await stat(file);
      if (!info.isFile()) { response.writeHead(404).end(); return; }
      response.setHeader('content-type', `${mime[path.extname(file)] ?? 'text/plain'}; charset=utf-8`);
      response.setHeader('cache-control', 'no-store');
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Static server failed to bind');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

/** Read actual, visible SVG paint after CSS variables and transforms resolve. */
export async function renderedMarks(page: Page): Promise<RenderedMark[]> {
  return page.locator('#nx-preview svg').evaluateAll((svgs) => svgs.flatMap((svg) =>
    Array.from(svg.querySelectorAll<SVGGraphicsElement>('path,circle,ellipse,rect,line,polyline,polygon,text,stop')).flatMap((element) => {
      if (element.tagName === 'stop') {
        const style = getComputedStyle(element);
        return [{ tag: 'stop', fill: Number(style.stopOpacity) === 0 ? 'none' : style.stopColor, stroke: 'none', strokeWidth: 0 }];
      }
      if (element.closest('defs,clipPath,mask')) return [];
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return [];
      const bounds = element.getBoundingClientRect();
      if (bounds.width === 0 && bounds.height === 0) return [];
      const matrix = element.getScreenCTM();
      const scale = matrix ? Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d)) : 1;
      return [{
        tag: element.tagName,
        // A line has no enclosed area; its default black fill never paints.
        fill: element.tagName === 'line' || Number(style.fillOpacity) === 0 ? 'none' : style.fill,
        stroke: Number(style.strokeOpacity) === 0 ? 'none' : style.stroke,
        strokeWidth: Number.parseFloat(style.strokeWidth) * (style.vectorEffect === 'non-scaling-stroke' ? 1 : scale),
      }];
    }),
  ));
}
