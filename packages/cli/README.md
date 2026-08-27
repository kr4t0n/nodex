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
nodex login                        sign in, by device code
nodex logout                       forget the stored token
nodex whoami                       who the token belongs to
```

Filters for `search`: `--design`, `--type`, `--tag`, `--tier`, `--density`.

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
