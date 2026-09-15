# @kubitnodes/nodex

Copy design languages and editable React components into an existing application.
A language supplies its tokens, written design rules, and expressive charts.
Shared primitives use the same tokens across languages.

```bash
npx @kubitnodes/nodex init mono-editorial
npx @kubitnodes/nodex add hairline-line arc-matrix button
```

## Requirements

The published CLI runs on Node 20 or newer and has no runtime package dependencies.
The consuming app supplies React 19, React DOM 19, TypeScript and Tailwind. The
components use React 19 ref-as-prop support; this prerequisite applies to
primitives and to `--no-install` delivery too. Nodex does
not install or replace those platform packages.

Charts currently use Recharts. `add` installs exact chart-library versions using
the project's npm, pnpm, Yarn or Bun setup. For Recharts, a missing `react-is`
peer is matched to the app's installed React version. Install the app's own
dependencies before adding charts if its React version is declared as a range.

## Delivered source

`init` writes `nodex.json`, the language token stylesheet and `docs/DESIGN.md`.
It appends a marked section to `AGENTS.md` while retaining other instructions.
Import `src/styles/nodex-tokens.css` once at the application entry.
It includes the language's declared font faces as embedded WOFF2 data, together
with their license text. Fonts work offline without an additional package or
remote stylesheet in the consumer app.

`add` copies each component's declared source files under
`src/components/nodex`. A chart normally arrives as one `component.tsx` containing
its typed props, calculations and React rendering. Shared hooks are copied under
`_shared/` only when required. Preserved primitive stylesheets arrive with their
components and are imported by those components.

```tsx
import { HairlineLine } from './components/nodex/hairline-line/component';
import { Button } from './components/nodex/button/component';

export function Dashboard() {
  return (
    <main className="grid gap-8">
      <HairlineLine
        aria-label="Daily signups"
        data={[
          { label: 'Monday', value: 120 },
          { label: 'Tuesday', value: 145 },
          { label: 'Wednesday', value: 132 },
        ]}
      />
      <Button variant="solid">View report</Button>
    </main>
  );
}
```

Sample data, examples, metadata and generated preview documents stay in the
registry. Required runtime assets and imported helpers are delivered. The app
owns all copied source; there is no separate Nodex runtime package.

## Commands

```text
nodex list                         list design languages
nodex search [query]               find components
nodex tokens <language> [--json]    print CSS tokens or their JSON source
nodex design <language>            print design guidance
nodex init <language>              configure a project
nodex show <ref> [--json]           inspect props, imports and dependencies
nodex add <ref...>                 copy components and install packages
nodex lint [path...]               check explicit source token usage
nodex login                       sign in by device code
nodex logout                      forget the stored token
nodex whoami                      inspect the current session
```

References can be language-qualified (`signal-console/endpoint-latency`) or bare
(`button`) when `nodex.json` or `--design` supplies a language. Search filters are
`--design`, `--type`, `--tag`, `--tier` and `--density`. Run any command with
`--help` for its arguments.

When combining expressive components from different languages, supply each
language's token layer in the appropriate scope. Adding a component does not
replace the project's active theme. Check an alternate-language component with
`nodex lint <component-directory> --design <language>`.

`add --to src/ui` overrides the component destination. `--no-install` copies
source and reports packages to install manually. Existing identical files are
reused; differing source is refused unless `--force` is given. The entire batch
is checked before writing, including shared-file conflicts and package pins.
`init --force` explicitly replaces differing generated language files or changes
the configured language. Custom destination paths are preserved.

Initialize Nodex in the React app package, including inside a monorepo. Package
manager detection starts there and walks through parent directories up to and
including the nearest Git root (or filesystem root when there is no Git marker).
The closest directory with settings wins: its `package.json` `packageManager`
field takes precedence over lockfiles; `pnpm-workspace.yaml` also identifies pnpm.
Conflicting manager files in that directory require an explicit `packageManager`.
With no settings, Nodex uses npm. Git worktree and submodule boundaries are
respected too.

For example, `apps/web/nodex.json` can use the pnpm declaration or lockfile at
the workspace root. Installation still runs in `apps/web`, and package conflicts
and React peers are checked against that app. `--no-install` uses the same
detection for its suggested command. Package-manager output goes to stderr so
`--json` stdout remains parseable.

## Agent-facing output and validation

`list`, `search`, `show`, `init` and `add` support `--json`. `show` and `search`
report explicit exports, import paths, prop types, preview dimensions, library
dependencies and delivered file addresses (`path` and `target`), without source
contents. Filter searches before inspecting individual refs, then read source
after `add`. `add` also reports actual destination paths, written files and
installed packages. No source parsing is used to guess exports or sample-data
shapes.

`nodex lint` checks TypeScript/TSX and CSS source for literal colors, unknown
`var(--nx-*)` references, nondeterministic data and explicit animation guards.
It shares these checks with the registry build. It does **not** execute React or
prove computed geometry, token override behavior, keyboard interaction or
accessibility. The registry additionally validates rendered previews in a browser;
consumer modifications still need application verification.

Without paths, lint checks `paths.components` in `nodex.json`. `add --to` does
not change that setting: use `nodex lint src/ui` after `nodex add <ref> --to src/ui`.
Paths resolve from the directory containing `nodex.json`, or the working directory
when no config exists. Each target must exist and contain `.ts`, `.tsx` or `.css`
source. Missing targets, unsupported files and directories with no matching source
fail with a nonzero exit code; no empty scan is reported as successful.

## Registry and credentials

Resolution order is `--registry`, `nodex.json`, `NODEX_REGISTRY`, then
`https://nodex.kubitnodes.com`. `init` records the resolved root for both local and
remote registries. Commands work from project subdirectories.

`--registry <checkout>` reads the checkout's built `public/` directory;
`--registry <checkout>/public` addresses the same root directly. Run
`npm run build:registry` in the checkout first. Served registries expose
`r/registry.json`, `r/languages.json` and the file addresses declared by those
manifests. Public content is static. Language token and design addresses also
come from the manifest, so guarded assets do not need CLI path conventions.

Remote registries use HTTPS; HTTP is supported for loopback development servers.
Credentials are stored in `~/.nodex/auth.json`, mode `0600`, keyed by origin.
`NODEX_TOKEN` overrides that file for CI, and `NODEX_CONFIG_DIR` relocates it.
Bearer tokens attach only to the registry's `api/` paths. Registry downloads do
not follow redirects. Source and destination paths are validated against
traversal and filesystem symlink escapes.

## License

MIT
