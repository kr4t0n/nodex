import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'nodex',
  description:
    'A component registry organised by design language. Pick a language and get its tokens, its written rules, and the components that belong to it.',
};

/**
 * The registry base. Empty means same origin; production may point at a CDN.
 * Duplicated from lib/registry.ts because the stylesheet links below are
 * rendered on the server, before any client module runs.
 */
const REGISTRY = (process.env.NEXT_PUBLIC_REGISTRY_URL ?? '').replace(/\/+$/, '');

/**
 * Primitives the shell itself is built from, loaded once.
 *
 * They reference only token variables, so they take on whichever language's
 * tokens.css is active. That is also why they are linked rather than imported:
 * these are the registry's own files, served as-is, so a broken primitive breaks
 * the app visibly instead of being quietly transformed by a bundler.
 *
 * Curated rather than "all 24", because these are render-blocking and the
 * landing page needs none of the other fourteen. Loading a stylesheet for a
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {SHELL_PRIMITIVES.map((name) => (
          <link
            key={name}
            rel="stylesheet"
            href={`${REGISTRY}/registry/primitives/${name}/component.css`}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
