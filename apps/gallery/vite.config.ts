import { createReadStream, existsSync, statSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * Mount the registry at stable URLs in both dev and build.
 *
 * The gallery previews components in iframes pointing at the generated
 * standalone documents, which reference `../../tokens.css` and
 * `./component.css` relatively. So the registry tree has to be served with its
 * shape intact rather than flattened into the app bundle.
 *
 *   /r/*        -> public/r      the built manifest and per-item JSON
 *   /registry/* -> registry/     generated previews, tokens.css, fragments
 */
function registryStatic(): Plugin {
  const mounts: Array<[string, string]> = [
    ['/r/', path.join(REPO_ROOT, 'public', 'r')],
    ['/registry/', path.join(REPO_ROOT, 'registry')],
  ];

  const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
  };

  return {
    name: 'nodex-registry-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        const mount = mounts.find(([prefix]) => url.startsWith(prefix));
        if (!mount) return next();
        const [prefix, dir] = mount;
        // Reject traversal before touching the filesystem.
        const rel = decodeURIComponent(url.slice(prefix.length));
        const file = path.join(dir, rel);
        if (!file.startsWith(dir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        if (!existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader(
          'Content-Type',
          TYPES[path.extname(file)] ?? 'application/octet-stream',
        );
        createReadStream(file).pipe(res);
      });
    },
    async closeBundle() {
      const dist = path.join(import.meta.dirname, 'dist');
      for (const [prefix, dir] of mounts) {
        if (!existsSync(dir)) continue;
        const target = path.join(dist, prefix.replace(/^\/|\/$/g, ''));
        await mkdir(path.dirname(target), { recursive: true });
        await cp(dir, target, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), registryStatic()],
  server: {
    port: 4180,
    // The registry lives outside the app root, so Vite has to be allowed to
    // read it for the dev middleware above.
    fs: { allow: [REPO_ROOT] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
