#!/usr/bin/env node
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { cmdLogin, cmdLogout, cmdWhoami } from './auth.ts';
import { planFiles, readOptional, writeFiles } from './delivery.ts';
import { installPackages, planInstall } from './install.ts';
import { lintSource, rulesFromTokens } from './lint.ts';
import { agentsSnippet, DEFAULT_PATHS, findConfig, withAgentsSnippet, type ProjectConfig } from './project.ts';
import { DEFAULT_REGISTRY, findItem, findLanguage, resolveRegistry, type Item, type Registry } from './registry.ts';
import { containedPath, writablePath } from './safety.ts';
import { bold, dim, fail, heading, out, rows } from './ui.ts';

const COMMAND_HELP: Record<string, string> = {
  list: 'nodex list [--json]\n\n  List design languages and component counts.',
  design: 'nodex design <language>\n\n  Print the design rules delivered by the language manifest.',
  tokens: 'nodex tokens <language> [--json]\n\n  Print generated CSS tokens, or their authored JSON tree.',
  search: 'nodex search [query] [--design <slug>] [--type <type>] [--tag <tag>]\n  [--tier primitive|expressive] [--density close-read|glance] [--json]\n\n  Find components by name, title, type and tags. JSON includes imports and typed props.',
  show: 'nodex show <ref> [--design <slug>] [--json]\n\n  Inspect explicit exports, props, preview dimensions, dependencies and delivered files.',
  init: 'nodex init <language> [--force] [--json]\n\n  Install tokens and design guidance, record nodex.json and append AGENTS.md.\n  Existing project paths are preserved. --force replaces differing generated files.',
  add: 'nodex add <ref...> [--to <dir>] [--design <slug>] [--no-install] [--force] [--json]\n\n  Copy editable React components and their declared local dependencies.\n  Install exact package versions with the project package manager.\n  --no-install copies source and reports packages to install yourself.\n  --force replaces differing source and conflicting package versions.\n  React 19, React DOM 19, TypeScript and Tailwind must already belong to the app.',
  lint: 'nodex lint [path...] [--design <slug>]\n\n  Check React/CSS source for literal colors, unknown token references,\n  nondeterministic data and explicit animation guards. Defaults to the\n  configured components directory. This source check does not render charts\n  or verify computed geometry, interaction behavior or accessibility.',
  login: 'nodex login\n\n  Sign in by device code. Credentials stay in ~/.nodex/auth.json.\n  CI can use NODEX_TOKEN instead.',
  logout: 'nodex logout\n\n  Forget this registry origin\'s stored token.',
  whoami: 'nodex whoami\n\n  Check the current registry session.',
  'new-language': 'nodex new-language <slug> [--registry <checkout>]\n\n  Scaffold a language in a source checkout. Authoring only.',
};

const USAGE = `
${bold('nodex')} — copy design languages and React components into your app

  list                         list design languages
  design <language>            read design guidance
  tokens <language> [--json]    read CSS or JSON tokens
  search [query] [filters]     find components
  show <ref> [--json]          inspect props, imports and dependencies
  init <language>              set up tokens and project guidance
  add <ref...>                 copy components and install dependencies
  lint [path...]               validate explicit source token usage
  login | logout | whoami      manage registry sessions
  new-language <slug>          scaffold a language (authoring)

  Global: --registry <dir|url>, --help
  Default registry: ${DEFAULT_REGISTRY}

  nodex init mono-editorial
  nodex add hairline-line arc-matrix button
  nodex add --help
`;

function emit(value: unknown): void { out(JSON.stringify(value, null, 2)); }

function itemDescription(item: Item, language = item.meta.language) {
  return {
    ref: item.meta.language === 'shared' ? item.name : `${item.meta.language}/${item.name}`,
    name: item.name,
    title: item.title,
    ...(item.description ? { description: item.description } : {}),
    language,
    tier: item.meta.tier,
    component: item.meta.component,
    runtime: item.meta.runtime,
    ...(item.meta.library ? { library: item.meta.library } : {}),
    ...(item.meta.density ? { density: item.meta.density } : {}),
    exports: item.meta.exports,
    entry: item.meta.entry,
    imports: item.meta.exports.map((name) => ({ name, from: `./${item.meta.entry.replace(/\.tsx?$/, '')}` })),
    props: item.meta.props ?? [],
    preview: item.meta.preview,
    dependencies: item.dependencies,
    ...(item.meta.externalData.length ? { externalData: item.meta.externalData } : {}),
    files: item.files,
    tags: item.meta.tags,
  };
}

function cmdList(registry: Registry, json: boolean): void {
  if (json) { emit(registry.languages); return; }
  heading(`Design languages  ${dim(registry.root)}`);
  for (const language of registry.languages) {
    out(`  ${bold(language.slug)} — ${language.name}`);
    out(`    ${dim(language.description)}`);
    if (language.counts) out(`    ${language.counts.expressive} charts, ${language.counts.primitives} primitives`);
  }
  out();
}

function cmdSearch(registry: Registry, query: string | undefined, filters: { design?: string; type?: string; tier?: string; tag?: string; density?: string }, json: boolean): void {
  const q = query?.toLowerCase();
  const matches = registry.items.filter((item) => {
    const { meta } = item;
    if (filters.design && meta.language !== filters.design && meta.language !== 'shared') return false;
    if (filters.type && meta.component !== filters.type) return false;
    if (filters.tier && meta.tier !== filters.tier) return false;
    if (filters.density && meta.density !== filters.density) return false;
    if (filters.tag && !meta.tags.includes(filters.tag)) return false;
    return !q || [item.name, item.title, meta.component, ...meta.tags].some((text) => text.toLowerCase().includes(q));
  });
  if (json) { emit(matches.map((item) => itemDescription(item))); return; }
  if (!matches.length) { out('Nothing matched. Run nodex search without filters to see the registry.'); return; }
  heading(`${matches.length} components`);
  rows(matches.map((item) => [itemDescription(item).ref, `${item.title} · ${item.meta.component} · ${item.meta.library ?? 'react'}`]));
  out();
}

function cmdShow(registry: Registry, ref: string, design: string | undefined, json: boolean): void {
  const found = findItem(registry, ref, design);
  if ('error' in found) fail(found.error);
  const description = itemDescription(found.item, found.language);
  if (json) { emit(description); return; }
  heading(description.title);
  if (description.description) out(`  ${description.description}`);
  rows([['language', description.language], ['type', description.component], ['runtime', description.runtime], ['library', description.library ?? 'React'], ['tier', description.tier], ['preview', `${description.preview.width} × ${description.preview.height}`]]);
  if (description.props.length) {
    heading('Props');
    rows(description.props.map((prop) => [`${prop.name}${prop.required ? ' (required)' : ''}`, `${prop.type}${prop.description ? ` — ${prop.description}` : ''}`]));
  }
  heading('Imports');
  for (const entry of description.imports) out(`  import { ${entry.name} } from '${entry.from}';`);
  heading('Delivered files');
  for (const file of description.files) out(`  ${file.target}`);
  if (description.dependencies.length) out(`\n  Packages: ${description.dependencies.join(', ')}`);
  out();
}

async function cmdInit(registry: Registry, slug: string, options: { force: boolean; json: boolean }): Promise<void> {
  const language = findLanguage(registry, slug);
  if (!language) fail(`No design language named "${slug}".`);
  const existing = await findConfig();
  const dir = existing?.dir ?? process.cwd();
  if (existing && !options.force && (existing.config.language !== slug || existing.config.registry !== registry.root)) {
    fail('This project already uses another language or registry. Use --force to change that configuration.');
  }
  const config: ProjectConfig = {
    ...existing?.config,
    language: slug,
    registry: registry.root,
    paths: existing?.config.paths ?? { ...DEFAULT_PATHS },
  };
  const [tokens, design] = await Promise.all([
    registry.read(language.files.tokens),
    registry.read(language.files.design),
  ]);
  const agentsPath = await writablePath(dir, 'AGENTS.md');
  const agents = withAgentsSnippet(await readOptional(agentsPath), agentsSnippet(config, language.name));
  const configContent = existing && existing.config.language === slug && existing.config.registry === registry.root
    ? await readFile(path.join(dir, 'nodex.json'), 'utf8')
    : `${JSON.stringify(config, null, 2)}\n`;
  const files = await planFiles(dir, [
    { relative: config.paths.tokens, content: tokens },
    { relative: config.paths.design, content: design },
    { relative: 'nodex.json', content: configContent },
  ], options.force);
  // AGENTS.md has already been merged; it never replaces unrelated instructions.
  const agentsFiles = await planFiles(dir, [{ relative: 'AGENTS.md', content: agents }], true);
  if (files.some((file) => file.absolute === agentsFiles[0]!.absolute)) {
    fail('Token and design destinations must not replace AGENTS.md.');
  }
  await writeFiles(dir, [...files, ...agentsFiles]);
  const written = [...files, ...agentsFiles].filter((file) => file.changed).map((file) => file.relative);
  if (options.json) { emit({ language: slug, registry: registry.root, config, written }); return; }
  heading(`Initialised ${language.name}`);
  for (const file of written) out(`  ${file}`);
  out(`\n  Import ${config.paths.tokens} once in the app entry.`);
  out('  The token stylesheet includes the language fonts.');
  out(`  Next: nodex add ${slug}/<component>\n`);
}

async function cmdAdd(registry: Registry, refs: string[], options: { to?: string; design?: string; json: boolean; force: boolean; noInstall: boolean }): Promise<void> {
  const found = await findConfig();
  if (!found && !options.to) fail('Run nodex init <language> first, or use --to <dir> for a one-off install with an existing token layer.');
  const dir = found?.dir ?? process.cwd();
  const design = options.design ?? found?.config.language;
  const base = options.to ?? found?.config.paths.components ?? DEFAULT_PATHS.components;
  if (path.isAbsolute(base)) fail('--to must be relative to the project directory.');
  containedPath(dir, base);
  const items: Array<{ item: Item; language: string }> = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const resolved = findItem(registry, ref, design);
    if ('error' in resolved) fail(resolved.error);
    const key = `${resolved.item.meta.language}/${resolved.item.name}`;
    if (!seen.has(key)) items.push(resolved);
    seen.add(key);
  }
  const content = new Map<string, string>();
  const files: Array<{ relative: string; content: string }> = [];
  for (const { item } of items) {
    for (const file of item.files) {
      if (!content.has(file.path)) content.set(file.path, await registry.read(file.path));
      files.push({ relative: path.join(base, file.target), content: content.get(file.path)! });
    }
  }
  const planned = await planFiles(dir, files, options.force);
  const packages = await planInstall(dir, items.flatMap(({ item }) => item.dependencies), options);
  if (!options.noInstall) await installPackages(dir, packages);
  await writeFiles(dir, planned);
  const added = items.map(({ item, language }) => ({
    ...itemDescription(item, language),
    dir: path.join(base, path.dirname(item.meta.entry)),
    entry: path.join(base, item.meta.entry),
    imports: item.meta.exports.map((name) => ({ name, from: `./${path.join(base, item.meta.entry).replace(/\.tsx?$/, '').split(path.sep).join('/')}` })),
    files: item.files.map((file) => path.join(base, file.target)),
  }));
  if (options.json) {
    emit({ added, files: planned.map((file) => file.relative), written: planned.filter((file) => file.changed).map((file) => file.relative), dependencies: packages.requested, installed: options.noInstall ? [] : packages.install, packageManager: packages.manager });
    return;
  }
  heading(`Added ${added.length} component${added.length === 1 ? '' : 's'}`);
  for (const item of added) {
    out(`  ${item.dir} — ${item.title}`);
    for (const entry of item.imports) out(`    import { ${entry.name} } from '${entry.from}';`);
  }
  if (options.noInstall && packages.install.length) out(`\n  Install packages: ${packages.manager} ${packages.args.join(' ')}`);
  out();
}

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(full));
    else if (entry.isFile() && /\.(tsx?|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

async function cmdLint(registry: Registry, paths: string[], design: string | undefined): Promise<void> {
  const found = await findConfig();
  const language = findLanguage(registry, design ?? found?.config.language ?? '');
  if (!language) fail('Run nodex init <language> or pass --design <language> before linting.');
  const rules = rulesFromTokens(JSON.parse(await registry.read(language.files.tokensJson)) as Record<string, unknown>);
  const dir = found?.dir ?? process.cwd();
  const roots = paths.length ? paths : [found?.config.paths.components ?? DEFAULT_PATHS.components];
  const files = new Set<string>();
  for (const root of roots) {
    const absolute = path.resolve(dir, root);
    if (/\.(tsx?|css)$/.test(root)) files.add(absolute);
    else for (const file of await sourceFiles(absolute)) files.add(file);
  }
  let errors = 0;
  for (const file of files) {
    const code = await readFile(file, 'utf8');
    const findings = lintSource(file.endsWith('.css') ? { css: code } : { tsx: code }, rules);
    for (const finding of findings) {
      out(`${path.relative(dir, file)}: ${finding.severity} ${finding.rule} — ${finding.message}`);
      if (finding.severity === 'error') errors++;
    }
  }
  out(`${files.size} source files checked; ${errors} errors. Rendered behavior requires application verification.`);
  if (errors) process.exitCode = 1;
}

async function cmdNewLanguage(slug: string, explicit?: string): Promise<void> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('Language slugs must use kebab-case.');
  if (explicit && /^https?:\/\//.test(explicit)) fail('new-language writes to a source checkout; --registry must be a local directory.');
  let root = path.resolve(explicit ?? process.cwd());
  for (;;) {
    const pkg = await readOptional(path.join(root, 'package.json'));
    if (pkg && (JSON.parse(pkg) as { name?: string }).name === 'nodex') break;
    const parent = path.dirname(root);
    if (parent === root) fail('Run new-language inside a nodex source checkout, or pass --registry <checkout>.');
    root = parent;
  }
  const base = `registry/languages/${slug}`;
  if (await readOptional(path.join(root, base, 'meta.json'))) fail(`Language ${slug} already exists.`);
  const title = slug.split('-').map((part) => part[0]!.toUpperCase() + part.slice(1)).join(' ');
  // Authoring runs against a source checkout. Its canonical language supplies
  // the shared contract so new primitive roles do not require a second template.
  const templatePath = 'registry/languages/mono-editorial/tokens.json';
  const templateSource = await readOptional(path.join(root, templatePath));
  if (!templateSource) fail(`The source checkout must contain ${templatePath} to scaffold the shared primitive tokens.`);
  const group = (value: unknown, name: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${templatePath} must define the ${name} token group.`);
    return value as Record<string, unknown>;
  };
  const template = group(JSON.parse(templateSource), 'root');
  const type = group(template.type, 'type');
  const motion = group(template.motion, 'motion');
  const tokens = {
    color: { bg: '#FFFFFF', ink: '#000000', muted: '#000000', faint: '#000000', grid: '#000000', onDarkFaint: '#000000' },
    ramp: { steps: ['#FFFFFF', '#000000'] },
    stroke: { hairline: '1px', mark: '1px', emphasis: '1.4px', lineMax: '1.4px' },
    radius: { ...group(template.radius, 'radius'), card: '0px', pill: '0px' },
    font: { sans: 'system-ui, sans-serif', mono: 'ui-monospace, monospace', weight: group(group(template.font, 'font').weight, 'font.weight') },
    space: { ...group(template.space, 'space'), cardPadding: '20px', gridGap: '20px', pagePadding: '32px' },
    type: {
      ...type,
      axis: { ...group(type.axis, 'type.axis'), size: '11px', weight: 400 },
      note: { ...group(type.note, 'type.note'), size: '12px', lineHeight: 1.5 },
      cardTitle: { ...group(type.cardTitle, 'type.cardTitle'), size: '16px', weight: 600 },
    },
    motion: { ...motion, draw: { ...group(motion.draw, 'motion.draw'), duration: '0.3s', easing: 'ease-out' } },
  };
  const files = await planFiles(root, [
    { relative: `${base}/meta.json`, content: `${JSON.stringify({ slug, name: title, description: 'Describe the purpose and visual identity of this language.', visibility: 'public', featured: [] }, null, 2)}\n` },
    { relative: `${base}/tokens.json`, content: `${JSON.stringify(tokens, null, 2)}\n` },
    { relative: `${base}/DESIGN.md`, content: `# ${title}\n\nThis language applies to complete interfaces, including pages, forms, controls and prose. Tokens hold the values; this document explains their visual relationships and rules.\n\n## Visual atmosphere\n\nDescribe the intended character, density and reading pace.\n\n## Color and contrast\n\nExplain semantic color roles, emphasis, surface hierarchy and contrast requirements. Reference the generated --nx-* variables.\n\n## Typography\n\nDescribe the typeface, hierarchy, tracking, line height and the purpose of each text role.\n\n## Layout and geometry\n\nExplain spacing, alignment, grids, responsive behavior, radii and stroke weight.\n\n## Content and interaction\n\nDefine grouping, labels, feedback, focus, keyboard access and the meaning of information states.\n\n## Motion\n\nExplain when motion communicates meaning, use the language motion roles and honor prefers-reduced-motion.\n\n## Anti-patterns\n\nRecord the visual and interaction choices this language forbids. Keep individual component descriptions and implementation procedures in their own documentation.\n` },
  ]);
  await writeFiles(root, files);
  await mkdir(await writablePath(root, `${base}/expressive`), { recursive: true });
  heading(`Scaffolded ${title}`);
  for (const file of files) out(`  ${file.relative}`);
  out(`\n  Author component.tsx, example.tsx and explicit meta.json under ${base}/expressive/<slug>/.\n  Run npm run build:registry.\n`);
}

async function main(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    registry: { type: 'string' }, to: { type: 'string' }, design: { type: 'string' },
    type: { type: 'string' }, tag: { type: 'string' }, density: { type: 'string' }, tier: { type: 'string' },
    json: { type: 'boolean', default: false }, force: { type: 'boolean', default: false },
    'no-install': { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false },
  } });
  const [command, ...rest] = positionals;
  if (!command || command === 'help' || values.help) {
    out(command && command !== 'help' ? `${COMMAND_HELP[command] ?? USAGE}\n\n  Global: --registry <dir|url>, --help\n` : USAGE);
    return;
  }
  if (!COMMAND_HELP[command]) fail(`Unknown command "${command}". Run nodex --help.`);
  if (command === 'new-language') {
    if (!rest[0]) fail('Give the new language a kebab-case slug.');
    await cmdNewLanguage(rest[0], values.registry);
    return;
  }
  const project = await findConfig();
  const registry = await resolveRegistry(values.registry ?? project?.config.registry);
  const design = values.design ?? project?.config.language;
  switch (command) {
    case 'list': cmdList(registry, values.json); return;
    case 'search': cmdSearch(registry, rest[0], values, values.json); return;
    case 'design':
    case 'tokens': {
      const slug = rest[0] ?? design;
      if (!slug) fail(`Pass a language to nodex ${command}.`);
      const language = findLanguage(registry, slug);
      if (!language) fail(`No design language named "${slug}".`);
      out(await registry.read(command === 'design' ? language.files.design : values.json ? language.files.tokensJson : language.files.tokens));
      return;
    }
    case 'show':
      if (!rest[0]) fail('Pass a component reference to nodex show.');
      cmdShow(registry, rest[0], design, values.json); return;
    case 'init':
      if (!rest[0]) fail('Pass a language to nodex init.');
      await cmdInit(registry, rest[0], values); return;
    case 'add':
      if (!rest.length) fail('Pass one or more component references to nodex add.');
      await cmdAdd(registry, rest, { ...values, noInstall: values['no-install'] }); return;
    case 'lint': await cmdLint(registry, rest, design); return;
    case 'login': await cmdLogin(registry); return;
    case 'logout': await cmdLogout(registry); return;
    case 'whoami': await cmdWhoami(registry); return;
  }
}

try { await main(process.argv.slice(2)); }
catch (error) { fail(error instanceof Error ? error.message : String(error)); }

export type { Item, Registry };
