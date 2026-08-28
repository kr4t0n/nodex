# @kubitnodes/nodex

Fetch design languages and components from a [nodex](https://nodex.kubitnodes.com)
registry.

nodex is a component registry organised by **design language** rather than by
component type. A language brings its own tokens, its own written rules, and the
components built for it. You pick a language once; everything you add after that
already agrees with it.

```bash
npx @kubitnodes/nodex init mono-editorial
npx @kubitnodes/nodex add mono-editorial/barcode-lollipop
```

Or install it:

```bash
npm install -g @kubitnodes/nodex
nodex list
```

## Why it exists

Components are delivered as plain HTML, CSS, and JavaScript fragments — no
framework, no build step, no runtime dependency on nodex. You own the files the
moment they land, and nodex never updates them.

`init` also writes the language's rules into your project and appends a section
to your `AGENTS.md`, so a coding agent working in the repo knows the design
constraints before it writes any UI.

## Commands

```
nodex list                         design languages in the registry
nodex search [query]               find components
nodex tokens <language>            print a language's tokens.css
nodex design <language>            print a language's DESIGN.md
nodex init <language>              set the project up
nodex add <ref...> [--to <dir>]    copy components in
nodex lint [path...]               check components against the language
nodex login                        sign in, by device code
nodex logout                       forget the stored token
nodex whoami                       who the token belongs to
```

Filters for `search`: `--design`, `--type`, `--tag`, `--tier`, `--density`.

`--help` after any command describes that command, not the whole CLI.

## For agents

`list`, `search`, `add` and `tokens` all take `--json`, which prints parseable
output alone on stdout with no headings. Prefer it to scraping the aligned
columns, which are for people and are not a stable format.

`add --json` also states the contract between the three files you were handed:

```json
{
  "added": [{
    "ref": "mono-editorial/arc-matrix",
    "dir": "src/components/nodex/arc-matrix",
    "files": ["...component.html", "...component.css", "...component.js"],
    "mounts": ["arcmatrix"],
    "exports": ["mount"],
    "aspectRatio": "430/320"
  }]
}
```

`mount(root)` fills the elements marked `data-nx-mount="<name>"` in the markup,
searching only within the root you pass it. **The names are chosen in the JS,
not derived from the slug** — `arc-matrix` mounts `arcmatrix`, and only three of
sixty-four match. `mounts` is how you find them without reading the source.

## Verifying conformance

`DESIGN.md` states rules that tokens cannot express. `nodex lint` checks the
ones a machine can decide, against the language recorded in your `nodex.json`:

- every hex literal is a member of the language's ramp
- no `stroke-width` exceeds its `lineMax`
- anything that animates ships a `prefers-reduced-motion` guard
- no `Math.random()`, so previews reproduce

It exits non-zero on an error and zero on a warning, because a warning marks a
judgement call and a lint that blocks on those gets switched off. A width it
cannot decide statically, like `.6 + rnd(i, j) * .9`, is reported rather than
guessed at.

Where a stroke genuinely is the area and its width carries the magnitude — a
ribbon, a band, a violin — put an empty `.nodex-stroke-as-area` file in the
component's directory to exempt it.

This is the same module the registry itself is built with, so a component that
passes here would pass there.

## Configuration

The CLI talks to <https://nodex.kubitnodes.com> unless told otherwise, so it
needs no configuration. To point somewhere else, pass `--registry <dir|url>` or
set `NODEX_REGISTRY`. Resolution order is the flag, then `nodex.json`, then the
environment variable, then the default. Nothing is inferred from the directory
you run in, so the registry a command uses is always something you can point at.

`init` writes `nodex.json` in your project recording the language and the
registry it used, so later `add` calls need no flags.

Credentials live in `~/.nodex/auth.json`, written `0600`, keyed by registry
origin. `NODEX_TOKEN` overrides the file entirely, which is how to run in CI
where nobody can approve a device code. `NODEX_CONFIG_DIR` relocates the
directory.

## Requirements

Node 20 or newer. The package has no dependencies.

## License

MIT
