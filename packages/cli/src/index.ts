#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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
  DEFAULT_REGISTRY,
  findItem,
  findLanguage,
  resolveRegistry,
  type Item,
  type Registry,
} from './registry.ts';
import { lint, rulesFromTokens } from './lint.ts';
import { clearToken, credentialsFor, saveToken } from './config.ts';
import { apiBase, awaitApproval, startDevice, whoami } from './device.ts';
import { bold, dim, fail, heading, out, rows } from './ui.ts';

/**
 * The web font a language asks for, from its own tokens.
 *
 * Was a hardcoded Inter link, which was invisible while one language existed
 * and wrong the moment a second arrived: telling someone installing a
 * monospace console language to add Inter is worse than saying nothing.
 * Returns undefined for a language that names no web font.
 */
function fontLink(spec: string | undefined): string | undefined {
  if (!spec) return undefined;
  return `<link href="https://fonts.googleapis.com/css2?family=${spec}&display=swap" rel="stylesheet">`;
}

/** `JetBrains+Mono:wght@400;700` reads back as `JetBrains Mono`. */
function faceName(spec: string | undefined): string {
  return (spec ?? '').split(':')[0]?.replace(/\+/g, ' ') ?? '';
}

/**
 * Per-command help.
 *
 * `nodex add --help` used to print the global page, so `--to` — the only flag
 * `add` has — was documented nowhere anyone would look for it.
 */
const COMMAND_HELP: Record<string, string> = {
  list: `${bold('nodex list')} [--json]

  Design languages in the registry, with component counts.`,

  design: `${bold('nodex design')} <language>

  Print the language's DESIGN.md: the rules tokens cannot express.
  Read this before writing UI in the language.`,

  tokens: `${bold('nodex tokens')} <language> [--json]

  Print the token layer. CSS custom properties by default, or the raw
  token tree with --json.`,

  search: `${bold('nodex search')} [query] [filters] [--json]

  Find components. The query matches name, title, type and tags.

  --design <slug>   only this language
  --type <enum>     mark and encoding, e.g. bar, donut, sankey
  --tag <tag>       data domain, e.g. billing, deploy
  --tier <t>        primitive | expressive
  --density <d>     close-read | glance, where the language declares it`,

  init: `${bold('nodex init')} <language>

  Set this project up: writes the token layer and DESIGN.md, records the
  choice in nodex.json, and appends a section to AGENTS.md so an agent
  working here knows the rules exist. Later "add" calls then need no flags.`,

  add: `${bold('nodex add')} <ref...> [--to <dir>] [--json]

  Copy components in. A ref is <language>/<name>, or a bare name for a
  shared primitive when the project or --design says which language.

  --to <dir>        write here instead of the path in nodex.json
  --design <slug>   language for bare refs
  --json            report files, mounts, exports and aspectRatio

  Components arrive as component.html, .css and .js. mount(root) fills the
  data-nx-mount elements in the markup, and those names are printed.`,

  show: `${bold('nodex show')} <ref> [--json]

  Everything the registry knows about a component without installing it:
  its type, runtime, viewBox, mount names, and the shape of the sample
  data it draws.

  The data shape answers "would this fit my numbers?" — dumbbell-queue
  reports [string, number, number] with 5 rows, so it wants a label and a
  before/after pair. Row counts are the sample's own, not a hard limit.`,

  lint: `${bold('nodex lint')} [path...]

  Check components against the rules of the language in nodex.json:
  palette membership, stroke maximum, a reduced-motion guard, and
  determinism. Defaults to the components directory.

  Exits non-zero on an error, zero on a warning.
  An empty .nodex-stroke-as-area file in a component's directory exempts
  it from the stroke maximum, for a stroke whose width carries data.`,

  login: `${bold('nodex login')}

  Sign in to a served registry by device code. Prints a URL and a short
  code to type into it. Stores the token in ~/.nodex/auth.json, 0600.
  In CI, set NODEX_TOKEN instead; nobody can approve a code there.`,

  logout: `${bold('nodex logout')}

  Forget the token stored for this registry.`,

  whoami: `${bold('nodex whoami')}

  Who the stored token belongs to.`,

  'new-language': `${bold('nodex new-language')} <slug>

  Scaffold a language inside a nodex checkout. Authoring only.`,
};

function commandHelp(command: string): string {
  const help = COMMAND_HELP[command];
  if (!help) {
    return `\n  No command named "${command}".\n${USAGE}`;
  }
  return `\n${help}\n\n  ${dim('Global: --registry <dir|url>, --help')}\n`;
}

const USAGE = `
${bold('nodex')} - fetch design languages and components from a registry

${bold('Commands')}
  list                             design languages in the registry
  design <language>                print the language's DESIGN.md
  tokens <language> [--json]       print tokens as CSS (default) or JSON
  search [query] [filters]         find components
  init <language>                  set this project up to use a language
  show <ref>                       what a component is, and the data it draws
  add <ref...> [--to <dir>]        copy components into this project
  lint [path...]                   check components against the language's rules
  new-language <slug>              scaffold a new language in a nodex checkout
  login                            sign in to a registry, by device code
  logout                           forget this registry's stored token
  whoami                           who the stored token belongs to

${bold('Filters for search')}
  --design <slug>   --type <enum>   --tag <tag>
  --density <value> --tier <primitive|expressive>

${bold('Global')}
  --registry <dir|url>   registry root. Also NODEX_REGISTRY.
                         Defaults to ${DEFAULT_REGISTRY}.
  --help

${bold('Examples')}
  nodex init mono-editorial
  nodex search heatmap --design mono-editorial
  nodex add mono-editorial/barcode-lollipop
  nodex add button --design mono-editorial --to src/ui
`;

/* ------------------------------------------------------------------ reading */

/**
 * Machine-readable output.
 *
 * Printed alone, with no heading and no dim text, so the whole of stdout parses.
 * This CLI is run by coding agents at least as often as by people, and an agent
 * given aligned columns has to scrape them — which means inventing a parser for
 * a format nobody promised to keep stable.
 */
function emit(value: unknown): void {
  out(JSON.stringify(value, null, 2));
}

/** What `add --json` reports per component. */
interface AddedComponent {
  ref: string;
  name: string;
  title: string;
  dir: string;
  files: string[];
  language: string;
  tier: string;
  runtime: string;
  /** The viewBox, as `width/height`. */
  aspectRatio?: string;
  /** `data-nx-mount` names `mount(root)` looks for inside the markup. */
  mounts?: string[];
  exports: string[];
  externalData?: string[];
}

function cmdList(registry: Registry, asJson = false): void {
  if (asJson) {
    emit(
      registry.languages.map((l) => ({
        slug: l.slug,
        name: l.name,
        description: l.description,
        visibility: l.visibility,
        ...(l.counts ? { counts: l.counts } : {}),
      })),
    );
    return;
  }

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
  asJson = false,
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

  if (asJson) {
    emit(
      matches.map((item) => ({
        ref:
          item.meta.language === 'shared'
            ? item.name
            : `${item.meta.language}/${item.name}`,
        name: item.name,
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
        language: item.meta.language,
        tier: item.meta.tier,
        component: item.meta.component,
        runtime: item.meta.runtime,
        ...(item.meta.density ? { density: item.meta.density } : {}),
        ...(item.meta.aspectRatio ? { aspectRatio: item.meta.aspectRatio } : {}),
        ...(item.meta.mounts?.length ? { mounts: item.meta.mounts } : {}),
        ...(item.meta.externalData?.length
          ? { externalData: item.meta.externalData }
          : {}),
        tags: item.meta.tags,
      })),
    );
    return;
  }

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

  // Read from the language rather than assumed, so a monospace language does
  // not tell someone to install Inter.
  let webfont: string | undefined;
  try {
    const raw = await registry.read(`registry/languages/${slug}/tokens.json`);
    webfont = (JSON.parse(raw) as { font?: { webfont?: string } }).font?.webfont;
  } catch {
    // A registry predating font.webfont. Skip the step rather than guess.
  }

  const link = fontLink(webfont);
  if (link) {
    out(`    2. Add the ${faceName(webfont)} stylesheet to your document head:`);
    out(`       ${dim(link)}`);
    out(`    3. nodex add ${slug}/<component>`);
  } else {
    out(`    2. nodex add ${slug}/<component>`);
  }
  out();
}

/**
 * Check a project's components against the rules of the language it uses.
 *
 * The point is that an agent can verify instead of asserting. `DESIGN.md` ships
 * to consumers saying "the conformance lint checks that literals are members of
 * the ramp" and "this is not optional and CI checks for it" — both true of this
 * repository and, until now, of nowhere the reader could reach. Describing
 * enforcement that a reader cannot run is worse than describing none, because
 * it invites them to assume something is being checked.
 *
 * Runs the same module the registry build runs, so a component that passes here
 * would pass there.
 */
async function cmdLint(
  registry: Registry,
  paths: string[],
  options: { design?: string },
): Promise<void> {
  heading('Lint');
  out();

  const found = await findConfig();
  const design = options.design ?? found?.config.language;
  if (!design) {
    fail(
      'Which language should these be checked against?\n' +
        '  Run `nodex init <language>` first, or pass --design <language>.',
    );
  }

  const language = findLanguage(registry, design);
  if (!language) fail(`No design language named "${design}".`);

  let tokens: Parameters<typeof rulesFromTokens>[0];
  try {
    tokens = JSON.parse(
      await registry.read(`registry/languages/${design}/tokens.json`),
    ) as Parameters<typeof rulesFromTokens>[0];
  } catch (cause) {
    fail(`Could not read tokens for "${design}".\n  ${String(cause)}`);
  }
  const rules = rulesFromTokens(tokens);

  const projectDir = found?.dir ?? process.cwd();
  const roots = paths.length
    ? paths
    : [found?.config.paths.components ?? 'src/components/nodex'];

  const dirs: string[] = [];
  for (const root of roots) {
    const abs = path.isAbsolute(root) ? root : path.join(projectDir, root);
    dirs.push(...(await componentDirs(abs)));
  }

  if (dirs.length === 0) {
    out(`  Nothing to check under ${roots.join(', ')}.`);
    out(`  ${dim('Pass a path, or run from a project with components installed.')}`);
    out();
    return;
  }

  let errors = 0;
  let warnings = 0;

  for (const dir of dirs.sort()) {
    const read = async (name: string): Promise<string | undefined> => {
      try {
        return await readFile(path.join(dir, name), 'utf8');
      } catch {
        return undefined;
      }
    };
    const css = await read('component.css');
    const js = await read('component.js');
    const html = await read('component.html');

    // A consumer has no meta.json, so the exemption is a marker file. Naming it
    // after the flag keeps the vocabulary the same as the registry's.
    const strokeAsArea = (await read('.nodex-stroke-as-area')) !== undefined;

    const findings = lint({ html, css, js }, rules, { strokeAsArea });
    if (findings.length === 0) continue;

    out(`  ${bold(path.relative(projectDir, dir) || dir)}`);
    for (const f of findings) {
      const tag = f.severity === 'error' ? 'error  ' : 'warning';
      out(`    ${tag} ${dim(f.rule)}  ${f.message}`);
      if (f.severity === 'error') errors++;
      else warnings++;
    }
    out();
  }

  const checked = `${dirs.length} component${dirs.length === 1 ? '' : 's'}`;
  if (errors === 0 && warnings === 0) {
    out(`  ${checked} conform to ${language.name}.`);
    out();
    return;
  }

  out(`  ${checked} checked against ${language.name}.`);
  out(`  ${errors} error(s), ${warnings} warning(s).`);
  out();
  // Warnings do not fail. They mark something a human has to judge, and a lint
  // that blocks on a judgement call gets disabled.
  if (errors > 0) process.exit(1);
}

/** Directories holding a component, found by looking for the fragment files. */
async function componentDirs(root: string): Promise<string[]> {
  const found: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && /^component\.(css|js|html)$/.test(e.name))) {
      found.push(dir);
    }
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
        await walk(path.join(dir, e.name));
      }
    }
  };
  await walk(root);
  return found;
}

/**
 * Everything the registry knows about one component, without installing it.
 *
 * Answering "would this fit my data?" used to mean add, read the source, infer,
 * then rewrite or discard. This is the lookup that replaces the first three
 * steps.
 */
function cmdShow(
  registry: Registry,
  ref: string,
  options: { design?: string; json?: boolean },
): void {
  const resolved = findItem(registry, ref, options.design);
  if ('error' in resolved) fail(resolved.error);
  const { item, language } = resolved;
  const { meta } = item;

  if (options.json) {
    emit({
      ref: meta.language === 'shared' ? item.name : `${meta.language}/${item.name}`,
      name: item.name,
      title: item.title,
      ...(item.description ? { description: item.description } : {}),
      language,
      tier: meta.tier,
      component: meta.component,
      runtime: meta.runtime,
      ...(meta.density ? { density: meta.density } : {}),
      ...(meta.aspectRatio ? { aspectRatio: meta.aspectRatio } : {}),
      ...(meta.mounts?.length ? { mounts: meta.mounts } : {}),
      ...(meta.data?.length ? { data: meta.data } : {}),
      ...(item.dependencies?.length ? { dependencies: item.dependencies } : {}),
      ...(meta.externalData?.length ? { externalData: meta.externalData } : {}),
      tags: meta.tags,
      files: (item.files ?? []).map((f) => path.basename(f.path)),
    });
    return;
  }

  heading(item.title);
  if (item.description) out(`  ${dim(item.description)}`);
  out();

  rows([
    ['language', language],
    ['type', meta.component],
    ['runtime', meta.runtime],
    ['tier', meta.tier],
    ...(meta.density ? ([['density', meta.density]] as Array<[string, string]>) : []),
    ...(meta.aspectRatio
      ? ([['viewBox', meta.aspectRatio]] as Array<[string, string]>)
      : []),
    ['tags', meta.tags.join(', ') || '—'],
  ]);

  if (meta.data?.length) {
    out();
    out(`  ${bold('Sample data')}`);
    out(`    ${dim('The shapes it draws. Row counts are the sample, not a limit.')}`);
    for (const d of meta.data) {
      out(`    ${d.name}  ${dim(`${d.of} × ${d.rows}`)}`);
      if (d.fields?.length) out(`      ${dim(d.fields.join(' · '))}`);
    }
  } else if (meta.tier === 'expressive') {
    out();
    out(`  ${bold('Sample data')}`);
    out(`    ${dim('Generated in the component rather than written as a literal,')}`);
    out(`    ${dim('so there is no shape to report. Read component.js.')}`);
  }

  if (meta.mounts?.length) {
    out();
    out(`  ${bold('Mounting')}`);
    out(`    ${dim('import { mount } from "./component.js"; mount(rootEl)')}`);
    out(`    ${dim('fills these data-nx-mount elements:')} ${meta.mounts.join(', ')}`);
  }

  if (item.dependencies?.length) {
    out();
    out(`  ${bold('Install')}`);
    out(`    npm install ${item.dependencies.join(' ')}`);
  }

  if (meta.externalData?.length) {
    out();
    out(`  ${bold('Heads up')}`);
    out(`    ${dim('Fetches from a third party at runtime; will not work offline:')}`);
    for (const url of meta.externalData) out(`      ${dim(url)}`);
  }

  out();
  out(`  ${dim(`nodex add ${meta.language === 'shared' ? item.name : `${meta.language}/${item.name}`}`)}`);
  out();
}

async function cmdAdd(
  registry: Registry,
  refs: string[],
  options: { to?: string; design?: string; json?: boolean },
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
  const report: AddedComponent[] = [];

  for (const ref of refs) {
    const resolved = findItem(registry, ref, design);
    if ('error' in resolved) fail(resolved.error);
    const { item } = resolved;

    const targetDir = path.join(projectDir, baseDir, item.name);
    await mkdir(targetDir, { recursive: true });

    const written: string[] = [];
    let js: string | undefined;
    for (const file of item.files ?? []) {
      const contents = await registry.read(file.path);
      const name = path.basename(file.path);
      await writeFile(path.join(targetDir, name), contents);
      written.push(path.join(baseDir, item.name, name));
      if (name === 'component.js') js = contents;
    }

    for (const dep of item.dependencies ?? []) deps.add(dep);
    for (const url of item.meta.externalData ?? []) external.add(url);
    added.push([
      path.join(baseDir, item.name),
      `${item.title}  ${item.meta.component}`,
    ]);

    report.push({
      ref:
        item.meta.language === 'shared'
          ? item.name
          : `${item.meta.language}/${item.name}`,
      name: item.name,
      title: item.title,
      dir: path.join(baseDir, item.name),
      files: written,
      language: item.meta.language,
      tier: item.meta.tier,
      runtime: item.meta.runtime,
      ...(item.meta.aspectRatio ? { aspectRatio: item.meta.aspectRatio } : {}),
      ...(item.meta.mounts?.length ? { mounts: item.meta.mounts } : {}),
      exports: js ? exportedNames(js) : [],
      ...(item.meta.externalData?.length
        ? { externalData: item.meta.externalData }
        : {}),
    });
  }

  if (options.json) {
    emit({
      added: report,
      ...(deps.size ? { dependencies: [...deps] } : {}),
      ...(external.size ? { externalData: [...external] } : {}),
    });
    return;
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

  // The three files are not self-explanatory together. `mount(root)` finds its
  // elements by `data-nx-mount="<name>"`, and the name is chosen in the JS
  // rather than derived from the slug — arc-matrix mounts "arcmatrix", and only
  // 3 of 64 match. Printing the names is what stops the reader having to grep
  // the source to find the contract between the files they were just handed.
  const mounted = report.filter((r) => r.mounts?.length);
  if (mounted.length > 0) {
    out();
    out(`  ${bold('Mounting')}`);
    out(`    ${dim('import { mount } from "./component.js"; mount(rootEl)')}`);
    out(
      `    ${dim('It fills the data-nx-mount elements in component.html, within rootEl:')}`,
    );
    for (const r of mounted) {
      out(`      ${r.name}  ${dim(r.mounts!.join(', '))}`);
    }
  }

  out();
  out(`  ${dim('Machine-readable: add --json')}`);
  out();
}

/** Top-level `export function NAME` and `export const NAME`. */
function exportedNames(js: string): string[] {
  return [
    ...new Set(
      [...js.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm)].map(
        (m) => m[1] as string,
      ),
    ),
  ];
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
    // Name the root. Without it this reads as a non-sequitur to anyone who
    // installed the CLI globally and happened to run it inside a checkout,
    // which is exactly where someone working on nodex runs everything.
    out('  This registry is a directory, read straight off disk, so there is');
    out('  no server to sign in to.');
    out();
    out(`    ${registry.root}`);
    out();
    out(`  ${dim('Drop --registry, or unset NODEX_REGISTRY, to use the hosted one:')}`);
    out(`    ${dim(DEFAULT_REGISTRY)}`);
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

  // Same trap as login: "not signed in to /Users/..." invites someone to sign
  // in to a directory, which is not a thing.
  if (!registry.isRemote) {
    out('  This registry is a directory, which has no sessions.');
    out();
    out(`    ${registry.root}`);
    out();
    out(`  ${dim(`Try: nodex whoami --registry ${DEFAULT_REGISTRY}`)}`);
    out();
    return;
  }

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

  // `--help` after a command describes that command. Printing the global page
  // for `nodex add --help` means the one flag it has, --to, is documented
  // nowhere the reader thought to look.
  if (values.help && command && command !== 'help') {
    out(commandHelp(command));
    return;
  }
  if (values.help || !command || command === 'help') {
    out(USAGE);
    return;
  }

  // A project initialised against a remote registry must keep talking to it,
  // or a later `add` with no --registry would fetch a component from somewhere
  // else. Precedence: flag, then project config, then env, then the default.
  // The project file outranks the environment on purpose: a pin recorded in the
  // repository should not be overridden by a stray shell variable.
  const project = await findConfig();
  const registry = await resolveRegistry(
    values.registry ?? project?.config.registry,
  );

  switch (command) {
    case 'list':
      cmdList(registry, values.json);
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
    case 'show': {
      const ref = rest[0];
      if (!ref) {
        fail('Which component? Try `nodex show mono-editorial/dumbbell-queue`.');
      }
      cmdShow(registry, ref, { design: values.design, json: values.json });
      return;
    }
    case 'lint':
      await cmdLint(registry, rest, { design: values.design });
      return;
    case 'search':
      cmdSearch(
        registry,
        rest[0],
        {
          design: values.design,
          type: values.type,
          tag: values.tag,
          density: values.density,
          tier: values.tier,
        },
        values.json,
      );
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
      await cmdAdd(registry, rest, {
        to: values.to,
        design: values.design,
        json: values.json,
      });
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
