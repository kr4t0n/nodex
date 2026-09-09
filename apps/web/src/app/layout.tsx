import type { Metadata } from 'next';
import { readCatalog } from '@/lib/manifest.server.ts';
import { OWN_LANGUAGE, registryFileUrl, tokensUrl } from '@/lib/registry.ts';

import './globals.css';

export const metadata: Metadata = {
  title: 'nodex',
  description:
    'A component registry organised by design language. Pick a language and get its tokens, its written rules, and the components that belong to it.',
};

/**
 * Primitives the shell itself is built from, loaded once.
 *
 * They reference only token variables, so they take on whichever language's
 * tokens.css is active. That is also why they are linked rather than imported:
 * these are the registry's own files, served as-is, so a broken primitive breaks
 * the app visibly instead of being quietly transformed by a bundler.
 *
 * Curated because these are render-blocking and the landing page only uses a
 * small set. Loading a stylesheet for a
 * class nothing renders themes nothing: re-theming happens through the
 * `--nx-*` variables in tokens.css, and there is no element for an unused
 * primitive to apply to.
 *
 * Curation is the hazard, so it is enforced rather than remembered:
 * `npm run check:shell` fails if any view writes a class this list does not
 * cover. Add the name here when that fires; do not delete the class.
 */
const SHELL_PRIMITIVES = [
  'alert',
  'button',
  'card',
  'badge',
  'input',
  'select',
  'rule',
  'prose',
  'code',
  'status',
  'empty-state',
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await readCatalog();
  const language = catalog.languages.find((entry) => entry.slug === OWN_LANGUAGE);
  if (!language) throw new Error(`Missing default language: ${OWN_LANGUAGE}`);
  const stylesheets = SHELL_PRIMITIVES.flatMap((name) => {
    const item = catalog.items.find((entry) => entry.name === name && entry.meta.tier === 'primitive');
    if (!item) throw new Error(`Missing shell primitive: ${name}`);
    return item.files.filter((file) => file.target.endsWith('.css')).map((file) => registryFileUrl(file.path));
  });

  return (
    <html lang="en" data-nx-language={OWN_LANGUAGE}>
      <head>
        <link id="nx-language-tokens" rel="stylesheet" href={tokensUrl(language)} />
        {[...new Set(stylesheets)].map((href) => (
          <link
            key={href}
            rel="stylesheet"
            href={href}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
