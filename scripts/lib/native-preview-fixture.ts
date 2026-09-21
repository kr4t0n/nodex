/** Exercise the real Preview in simultaneous token scopes without an auth session. */
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

import { serveDirectory } from './browser.ts';

export async function nativePreviewFixture(site: string) {
  const root = path.resolve(import.meta.dirname, '../..');
  const directory = await mkdtemp(path.join(tmpdir(), 'nodex-native-preview-test-'));
  let server: Awaited<ReturnType<typeof serveDirectory>> | undefined;
  try {
    const html = await fetch(site).then((response) => response.text());
    const styles = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]
      .map((match) => `<link rel="stylesheet" href="${new URL(match[1]!, site).href}">`).join('\n');
    await build({
      stdin: { contents: `
        import { createRoot } from 'react-dom/client';
        import { Preview } from './apps/web/src/components/Preview.tsx';
        import { useScopedLanguageTokens } from './apps/web/src/lib/hooks.ts';
        const catalog = await fetch('/r/gallery.json').then((response) => response.json());
        function App() {
          const ready = useScopedLanguageTokens(['mono-editorial', 'sketchbook']);
          if (!ready) return null;
          const find = (language, name) => catalog.items.find((item) => item.meta.language === language && item.name === name);
          return <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
            <Preview item={find('mono-editorial', 'hairline-line')} language="mono-editorial" />
            <Preview item={find('sketchbook', 'sketch-bars')} language="sketchbook" />
            <Preview item={find('shared', 'radio')} language="mono-editorial" />
            <Preview item={find('shared', 'radio')} language="sketchbook" />
            <Preview item={find('sketchbook', 'sketch-bars')} language="sketchbook" />
            <Preview item={{ ...find('shared', 'radio'), name: 'unavailable' }} language="mono-editorial" />
          </main>;
        }
        createRoot(document.getElementById('root')).render(<App />);
      `, loader: 'tsx', resolveDir: root },
      outdir: directory, entryNames: 'fixture', bundle: true, splitting: true,
      format: 'esm', jsx: 'automatic', minify: true, logLevel: 'silent',
      alias: { '@': path.join(root, 'apps/web/src') },
      define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_REGISTRY_URL': '""' },
    });
    for (const name of ['r', 'registry']) await symlink(path.join(root, 'public', name), path.join(directory, name));
    await writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8">${styles}<link rel="stylesheet" href="fixture.css"></head><body><div id="root"></div><script type="module" src="fixture.js"></script></body></html>`);
    server = await serveDirectory(directory);
    return { origin: server.origin, close: async () => {
      await server?.close();
      await rm(directory, { recursive: true, force: true });
    } };
  } catch (error) {
    await server?.close();
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
