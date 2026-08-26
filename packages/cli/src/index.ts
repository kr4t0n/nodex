#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import {
  agentsSnippet,
  appendToAgentsFile,
  DEFAULT_PATHS,
  findConfig,
  writeConfig,
  type ProjectConfig,
} from './project.ts';
import {
  findItem,
  findLanguage,
  resolveRegistry,
  type Item,
  type Registry,
} from './registry.ts';
import { clearToken, credentialsFor, saveToken } from './config.ts';
import { apiBase, awaitApproval, startDevice, whoami } from './device.ts';
import { bold, dim, fail, heading, out, rows } from './ui.ts';

const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">';

const USAGE = `
${bold('nodex')} - fetch design languages and components from a registry

${bold('Commands')}
  list                             design languages in the registry
  design <language>                print the language's DESIGN.md
  tokens <language> [--json]       print tokens as CSS (default) or JSON
  search [query] [filters]         find components
  init <language>                  set this project up to use a language
  add <ref...> [--to <dir>]        copy components into this project
  new-language <slug>              scaffold a new language in a nodex checkout
  login                            sign in to a registry, by device code
  logout                           forget this registry's stored token
  whoami                           who the stored token belongs to

${bold('Filters for search')}
  --design <slug>   --type <enum>   --tag <tag>
  --density <value> --tier <primitive|expressive>

${bold('Global')}
  --registry <dir|url>   registry root. Also NODEX_REGISTRY.
                         Defaults to the nearest nodex checkout.
  --help

${bold('Examples')}
  nodex init mono-editorial
  nodex search heatmap --design mono-editorial
  nodex add mono-editorial/barcode-lollipop
  nodex add button --design mono-editorial --to src/ui
`;

/* ------------------------------------------------------------------ reading */

function cmdList(registry: Registry): void {
  if (registry.languages.length === 0) {
    out('\nThe registry contains no design languages.\n');
    return;
  }
  heading(`Design languages  ${dim(registry.root)}`);
  out();
  for (const language of registry.languages) {
    const counts = language.counts
      ? `${language.counts.expressive} components, ${language.counts.primitives} primitives`
      : '';
    out(`  ${bold(language.slug)}  ${dim(counts)}`);
    if (language.description) out(`    ${dim(language.description)}`);
    if (language.visibility === 'restricted') {
      out(`    ${dim('restricted: requires nodex login')}`);
    }
    out();
  }
}

async function cmdDesign(registry: Registry, slug: string): Promise<void> {
  if (!findLanguage(registry, slug)) fail(`No design language named "${slug}".`);
  out(await registry.read(`registry/languages/${slug}/DESIGN.md`));
}

async function cmdTokens(
  registry: Registry,
  slug: string,
  asJson: boolean,
): Promise<void> {
  if (!findLanguage(registry, slug)) fail(`No design language named "${slug}".`);
  const file = asJson ? 'tokens.json' : 'tokens.css';
  out(await registry.read(`registry/languages/${slug}/${file}`));
}

function cmdSearch(
  registry: Registry,
  query: string | undefined,
  filters: {
    design?: string;
    type?: string;
    tag?: string;
    density?: string;
    tier?: string;
  },
): void {
  const q = query?.toLowerCase();
  const matches = registry.items.filter((item) => {
    const { meta } = item;
    if (filters.design && meta.language !== filters.design) {
      // Shared primitives belong to every language, so a language filter must
      // not hide them.
      if (meta.language !== 'shared') return false;
    }
    if (filters.type && meta.component !== filters.type) return false;
    if (filters.tier && meta.tier !== filters.tier) return false;
    if (filters.density && meta.density !== filters.density) return false;
    if (filters.tag && !meta.tags.includes(filters.tag)) return false;
    if (!q) return true;
    return (
      item.name.includes(q) ||
      item.title.toLowerCase().includes(q) ||
      meta.component.includes(q) ||
      meta.tags.some((tag) => tag.includes(q))
    );
  });

  if (matches.length === 0) {
    out('\nNothing matched. Try `nodex search` with no filters to see everything.\n');
    return;
  }

  heading(`${matches.length} component${matches.length === 1 ? '' : 's'}`);
  out();
  rows(
    matches.map((item) => {
      const ref =
        item.meta.language === 'shared'
          ? item.name
          : `${item.meta.language}/${item.name}`;
      const facets = [
        item.meta.component,
        item.meta.runtime,
        item.meta.density ?? item.meta.tier,
      ].join(' · ');
      return [ref, `${item.title}  ${facets}`];
    }),
  );
  out();
}

/* ------------------------------------------------------------------ writing */

async function cmdInit(
  registry: Registry,
  slug: string,
  overrides: Partial<ProjectConfig['paths']>,
): Promise<void> {
  const language = findLanguage(registry, slug);
  if (!language) fail(`No design language named "${slug}".`);

  const dir = process.cwd();
  const config: ProjectConfig = {
    language: slug,
    ...(registry.isRemote ? { registry: registry.root } : {}),
    paths: { ...DEFAULT_PATHS, ...overrides },
  };

  const written: string[] = [];

  const tokens = await registry.read(`registry/languages/${slug}/tokens.css`);
  const tokensPath = path.join(dir, config.paths.tokens);
  await mkdir(path.dirname(tokensPath), { recursive: true });
  await writeFile(tokensPath, tokens);
  written.push(config.paths.tokens);

  const design = await registry.read(`registry/languages/${slug}/DESIGN.md`);
  const designPath = path.join(dir, config.paths.design);
  await mkdir(path.dirname(designPath), { recursive: true });
  await writeFile(designPath, design);
  written.push(config.paths.design);

  await writeConfig(dir, config);
  written.push('nodex.json');

  const agents = await appendToAgentsFile(dir, agentsSnippet(config, language.name));
  if (!agents.skipped) written.push('AGENTS.md');

  heading(`Initialised ${language.name}`);
  out();
  for (const file of written) out(`  ${file}`);
  if (agents.skipped) {
    out(`  ${dim('AGENTS.md already documents a design language, left alone')}`);
  }

  out();
  out(`  ${bold('Next')}`);
  out(`    1. Import ${config.paths.tokens} once, at your app root.`);
  out(`    2. Add the Inter stylesheet to your document head:`);
  out(`       ${dim(FONT_LINK)}`);
  out(`    3. nodex add ${slug}/<component>`);
  out();
}

async function cmdAdd(
  registry: Registry,
  refs: string[],
  options: { to?: string; design?: string },
): Promise<void> {
  const found = await findConfig();

  if (!found && !options.to) {
    fail(
      'This project is not set up for nodex yet.\n' +
        '  Run `nodex init <language>` first, or pass --to <dir> for a one-off.\n' +
        '  Components reference token variables, so without a token layer they\n' +
        '  will render unstyled.',
    );
  }

  const projectDir = found?.dir ?? process.cwd();
  const design = options.design ?? found?.config.language;
  const baseDir = options.to ?? found?.config.paths.components ?? 'src/components/nodex';

  const deps = new Set<string>();
  const external = new Set<string>();
  const added: Array<[string, string]> = [];

  for (const ref of refs) {
    const resolved = findItem(registry, ref, design);
    if ('error' in resolved) fail(resolved.error);
    const { item } = resolved;

    const targetDir = path.join(projectDir, baseDir, item.name);
    await mkdir(targetDir, { recursive: true });

    for (const file of item.files ?? []) {
      const contents = await registry.read(file.path);
      const name = path.basename(file.path);
      await writeFile(path.join(targetDir, name), contents);
    }

    for (const dep of item.dependencies ?? []) deps.add(dep);
    for (const url of item.meta.externalData ?? []) external.add(url);
    added.push([
      path.join(baseDir, item.name),
      `${item.title}  ${item.meta.component}`,
    ]);
  }

  heading(`Added ${added.length} component${added.length === 1 ? '' : 's'}`);
  out();
  rows(added);

  if (deps.size > 0) {
    out();
    out(`  ${bold('Install')}`);
    out(`    npm install ${[...deps].join(' ')}`);
  }

  if (external.size > 0) {
    out();
    out(`  ${bold('Heads up')}`);
    out('    These fetch data from a third party at runtime, so they need');
    out('    network access and will not work offline:');
    for (const url of external) out(`      ${dim(url)}`);
  }

  out();
  out(`  ${dim('Mount a component with: import { mount } from "./component.js"')}`);
  out();
}

async function cmdNewLanguage(registry: Registry, slug: string): Promise<void> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    fail(`"${slug}" is not a valid slug. Use lowercase and hyphens.`);
  }
  if (registry.isRemote) {
    fail(
      'new-language scaffolds files, so it needs a local registry.\n' +
        '  Run it inside a nodex checkout, or pass --registry <dir>.',
    );
  }
  if (findLanguage(registry, slug)) {
    fail(`A design language named "${slug}" already exists.`);
  }

  const dir = path.join(registry.root, 'registry', 'languages', slug);
  await mkdir(path.join(dir, 'expressive'), { recursive: true });

  const title = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  // Every language has the same shape. Scaffolding it beats copying an existing
  // language and deleting things, which is how drift starts.
  await writeFile(
    path.join(dir, 'meta.json'),
    `${JSON.stringify(
      {
        slug,
        name: title,
        description: 'One sentence on what this language is for.',
        visibility: 'public',
        featured: [],
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(
    path.join(dir, 'tokens.json'),
    `${JSON.stringify(
      {
        color: { bg: '#FFFFFF', ink: '#000000', muted: '#000000', faint: '#000000', grid: '#000000' },
        ramp: { steps: ['#FFFFFF', '#000000'] },
        stroke: { scale: ['1px'], hairline: '1px', lineMax: '1.4px' },
        radius: { card: '0px', pill: '0px' },
        font: { sans: "system-ui, sans-serif", weights: [400, 700] },
        space: { cardPadding: '20px', gridGap: '20px', pagePadding: '32px' },
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(
    path.join(dir, 'DESIGN.md'),
    `# ${title}

One paragraph on the feeling this language is going for.

## Visual atmosphere

Density, variance, and motion, in a sentence each.

## Color calibration

Each token with its hex and the job it does.

## Typographic architecture

Stack, scale, and tracking. Say why this face and not another.

## Component behaviors

States and the interaction contract. If cards have a fixed anatomy, fix it here.

## Layout principles

Grid, gap, and spacing rhythm.

## Motion philosophy

What moves, when, and why. Every language must honour
\`prefers-reduced-motion\`; CI enforces it.

## Runtime token bindings

How a stroke width is spelled in each runtime this language uses.

## Anti-patterns

The explicit never-do list. This section does the most work of any in the file,
because it is what stops an agent producing something technically on-palette
that still looks wrong.
`,
  );

  const rel = path.relative(process.cwd(), dir) || dir;
  heading(`Scaffolded ${title}`);
  out();
  out(`  ${rel}/meta.json`);
  out(`  ${rel}/tokens.json`);
  out(`  ${rel}/DESIGN.md`);
  out(`  ${rel}/expressive/`);
  out();
  out(`  ${bold('Next')}`);
  out('    1. Fill in tokens.json, then DESIGN.md.');
  out('    2. Add components under expressive/<slug>/ as component.html/.css/.js.');
  out('    3. npm run build:registry');
  out();
  out(`  ${dim('Languages are discovered by directory, so there is nothing to register.')}`);
  out();
}

/**
 * Sign in by device code.
 *
 * The CLI cannot receive a redirect, so the browser does the authenticating and
 * the terminal polls. What comes back is a nodex session, not a GitHub token, so
 * signing out only has to delete it in one place.
 */
async function cmdLogin(registry: Registry): Promise<void> {
  heading('Login');
  out();

  if (!registry.isRemote) {
    out('  This is a local checkout, so there is nothing to sign in to.');
    out(`  ${dim('Point at a served registry with --registry <url> or NODEX_REGISTRY.')}`);
    out();
    return;
  }

  if (process.env.NODEX_TOKEN) {
    out(`  ${bold('NODEX_TOKEN')} is set, and it takes precedence.`);
    out(`  ${dim('Unset it to sign in interactively instead.')}`);
    out();
    return;
  }

  const api = apiBase(registry.root);

  let start;
  try {
    start = await startDevice(api);
  } catch (cause) {
    fail(cause instanceof Error ? cause.message : 'Could not start sign in.');
  }

  out(`  Open  ${bold(start.verificationUri)}`);
  out(`  Code  ${bold(start.userCode)}`);
  out();
  out(`  ${dim('Waiting for approval. Ctrl-C to cancel.')}`);
  out();

  let granted;
  try {
    granted = await awaitApproval(api, start);
  } catch (cause) {
    fail(cause instanceof Error ? cause.message : 'Sign in failed.');
  }

  const where = await saveToken(registry.root, {
    token: granted.token,
    login: granted.login ?? undefined,
  });

  out(`  ${bold('Signed in')}${granted.login ? ` as ${granted.login}` : ''}.`);
  out(`  ${dim(`Token stored in ${where} (readable only by you).`)}`);
  out();
}

async function cmdLogout(registry: Registry): Promise<void> {
  heading('Logout');
  out();

  if (process.env.NODEX_TOKEN) {
    out(`  ${bold('NODEX_TOKEN')} is set in this environment.`);
    out(`  ${dim('Unset it; there is nothing on disk to remove.')}`);
    out();
    return;
  }

  const removed = await clearToken(registry.root);
  out(
    removed
      ? `  Signed out of ${registry.root}.`
      : `  Was not signed in to ${registry.root}.`,
  );
  out();
}

/** Who the stored token belongs to, checked against the server. */
async function cmdWhoami(registry: Registry): Promise<void> {
  heading('Whoami');
  out();

  const credentials = await credentialsFor(registry.root);
  if (!credentials) {
    out(`  Not signed in to ${registry.root}.`);
    out(`  ${dim('Run `nodex login`.')}`);
    out();
    return;
  }

  const who = await whoami(apiBase(registry.root), credentials.token);
  if (!who) {
    out('  The stored token is no longer valid.');
    out(`  ${dim('Run `nodex login` again.')}`);
    out();
    return;
  }

  out(`  ${bold(who.login)} at ${registry.root}`);
  out();
}

/* -------------------------------------------------------------------- entry */

async function main(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      to: { type: 'string' },
      design: { type: 'string' },
      type: { type: 'string' },
      tag: { type: 'string' },
      density: { type: 'string' },
      tier: { type: 'string' },
      json: { type: 'boolean', default: false },
      css: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const [command, ...rest] = positionals;

  if (values.help || !command || command === 'help') {
    out(USAGE);
    return;
  }

  // A project initialised against a remote registry must keep talking to it.
  // Without this, a later `add` with no --registry would silently fall back to
  // whatever local checkout happened to be above the cwd and fetch the wrong
  // version of a component. Precedence: flag, then project config, then env,
  // then the nearest checkout.
  const project = await findConfig();
  const registry = await resolveRegistry(
    values.registry ?? project?.config.registry,
  );

  switch (command) {
    case 'list':
      cmdList(registry);
      return;
    case 'design': {
      const slug = rest[0] ?? values.design;
      if (!slug) fail('Which language? Try `nodex design mono-editorial`.');
      await cmdDesign(registry, slug);
      return;
    }
    case 'tokens': {
      const slug = rest[0] ?? values.design;
      if (!slug) fail('Which language? Try `nodex tokens mono-editorial`.');
      await cmdTokens(registry, slug, values.json);
      return;
    }
    case 'search':
      cmdSearch(registry, rest[0], {
        design: values.design,
        type: values.type,
        tag: values.tag,
        density: values.density,
        tier: values.tier,
      });
      return;
    case 'init': {
      const slug = rest[0];
      if (!slug) fail('Which language? Try `nodex init mono-editorial`.');
      await cmdInit(registry, slug, {});
      return;
    }
    case 'add': {
      if (rest.length === 0) {
        fail('What should I add? Try `nodex add mono-editorial/barcode-lollipop`.');
      }
      await cmdAdd(registry, rest, { to: values.to, design: values.design });
      return;
    }
    case 'new-language': {
      const slug = rest[0];
      if (!slug) fail('What is it called? Try `nodex new-language bold-brutalist`.');
      await cmdNewLanguage(registry, slug);
      return;
    }
    case 'login':
      await cmdLogin(registry);
      return;
    case 'logout':
      await cmdLogout(registry);
      return;
    case 'whoami':
      await cmdWhoami(registry);
      return;
    default:
      fail(`Unknown command "${command}". Run \`nodex --help\`.`);
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

export type { Item, Registry };
