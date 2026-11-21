# Review verification recipes

Use these recipes for focused investigations alongside the
[verification suite](../../../../AGENTS.md#verification). Start with the
[local toolchain](../../../../AGENTS.md#local-development) installed, including
Playwright Chromium. Run shell commands from the repository root unless stated
otherwise. Build the registry before consuming its manifests or previews, and
build the website before checking gallery views. Do not run two registry builds,
or a registry build and the read-only contract test, in the same checkout:
the test fingerprints published files while it runs.

Keep scripts, logs and evidence outside the checkout:

```bash
review_root="$(pwd)"
review_dir="$(mktemp -d)"
export NODEX_EVIDENCE_DIR="$review_dir/evidence"
```

Record the revisions, browser, viewport, mode and assertions with the results.
Retain useful measurements in the PR and images in CI artifacts, print the
temporary path, then remove it after stopping its servers and browsers. Source
probes do not replace the consumer smoke that checks copied delivery files.

## Match the mode comparison to CI

Set `review_base` to the full base SHA of the PR being reviewed, available from
the PR's `base.sha` API field. Ensure that commit is fetched locally, then run:

```bash
git cat-file -e "$review_base^{commit}"
NODEX_BASE_REF="$review_base" pnpm run smoke:modes
```

[The check](../../../../scripts/smoke-modes.ts) otherwise uses
`git merge-base HEAD origin/dev`. [CI](../../../../.github/workflows/ci.yml) uses
`${{ github.event.pull_request.base.sha || github.event.before }}`: the PR base
for pull requests, or the previous commit for pushes. Record the actual baseline
from `comparison.txt`; a different baseline is a different comparison.

## Mount charts with custom data

Use a temporary entry when the gallery fixture does not cover an edge case,
such as fractional bins, zero totals, one-sided pairs or long labels at 320px.
Read the component's exported types and metadata before supplying data.

1. Write `$review_dir/entry.tsx` with absolute imports of the checkout's
   `component.tsx` files and `createRoot` from `react-dom/client`. Mount into an
   element with ID `root`, and give each case its own ID. Import `example.tsx`
   only when comparing the existing specimen. Keep cases in block flow, or use
   `min-width: 0` on grid items so their minimum width does not create false page
   overflow.
2. Bundle with the checkout's packages. These aliases also cover subpath imports
   such as `react/jsx-runtime` and `react-dom/client`:

   ```bash
   "$review_root/node_modules/.bin/esbuild" "$review_dir/entry.tsx" \
     --bundle --format=esm --jsx=automatic \
     --define:process.env.NODE_ENV='"production"' \
     --alias:react="$review_root/node_modules/react" \
     --alias:react-dom="$review_root/node_modules/react-dom" \
     --alias:recharts="$review_root/node_modules/recharts" \
     --outfile="$review_dir/app.js"
   ```

3. Write `$review_dir/input.css`. Use an absolute import of
   `<checkout>/node_modules/tailwindcss/index.css` with `source(none)`, then
   absolute `@source` paths for `registry/languages/<language>`,
   `registry/_shared` and the entry file. Include `registry/primitives` when
   mounting primitives. A bare `@import 'tailwindcss'` in a system-temporary
   directory cannot resolve the checkout's packages. Compile it:

   ```bash
   "$review_root/node_modules/.bin/tailwindcss" \
     -i "$review_dir/input.css" -o "$review_dir/app.css"
   ```

4. Write an HTML page with a viewport meta tag, the `root` element, `app.css`,
   the built `public/registry/languages/<language>/tokens.css` after it, and a
   module script for `app.js`. Set `data-nx-language="<language>"` on `<html>`.
   For a language supporting dark mode, set `data-nx-mode="dark"` on that same
   element; changing it live must retain mounted state. If esbuild emits CSS
   from component imports, include that too; use a distinct utility CSS filename
   so the Tailwind step does not overwrite it.
5. In a temporary `.mjs` probe, use `createRequire` from `node:module` with the
   absolute `<checkout>/package.json` to load `@playwright/test`. The root does
   not declare a package named `playwright`. Route `http://probe.test/**` with
   `page.route` to fulfill the HTML, JavaScript, CSS and token stylesheet from an
   explicit file map, setting each response's content type. Abort unmapped
   requests. Then `page.goto('http://probe.test/')` needs no listening port.
6. Wait for the expected chart marks and loaded fonts before measuring. Check
   actual label boxes, paint, keyboard behavior and live reduced motion as
   relevant; a page loading successfully is not a layout assertion.

For a base comparison, `git clone --shared` the checkout into a fresh temporary
subdirectory and check out `review_base` there. Build a second entry using those
source paths and that revision's tokens and utility sources. Reusing the head's
package aliases isolates source changes only when the package versions match;
install the base's dependencies if dependency changes are part of the comparison.

## Compare two website builds

Set `review_base` as above and commit the head under review. Clone both revisions
outside the checkout so Next's generated output remains independent:

```bash
review_head="$(git rev-parse HEAD)"
review_store="$(pnpm store path)"
for side in base head; do
  git clone --shared "$review_root" "$review_dir/$side"
done
git -C "$review_dir/base" checkout --detach "$review_base"
git -C "$review_dir/head" checkout --detach "$review_head"
for side in base head; do
  (
    cd "$review_dir/$side"
    pnpm install --frozen-lockfile --store-dir "$review_store"
    pnpm run build:registry
    pnpm --filter @nodex/web run build
  )
done
```

`--offline` is an optional install flag when all required packages are already
in the shared store. Copying already built `public/r/` and `public/registry/`
into each clone can replace its registry build only when all registry inputs
match: authored registry files, compiler/build scripts and dependencies. A diff
that leaves `registry/` untouched alone does not establish that.

Run each clone's local `next start --hostname 127.0.0.1 --port <port>` from its
`apps/web` directory, with distinct free ports and `NODE_ENV=production`.
Alternatively, import each clone's [startSite](../../../../scripts/lib/site.ts)
and call it: it starts that clone's built site on a free loopback port and returns
`{ origin, close }`. Close both servers in `finally`.

Point the same browser script at both origins. A temporary `.mjs` script can
import `checkGalleryModes` from the head clone's
[gallery-modes.ts](../../../../scripts/lib/gallery-modes.ts), loading Playwright
through `createRequire('<head-clone>/package.json')`. Call
`checkGalleryModes(browser, origin, evidenceDir)` for each origin with separate
evidence directories. Node's supported TypeScript execution handles this import;
no global TypeScript runner is needed. The check installs a test-only mode palette
and exercises light/dark controls, focus and retained state. Keep the check's
revision fixed when comparing implementations. A failure on the base may be the
regression the head fixes; it is not automatically an invalid comparison.

For an isolated mutation experiment, a head clone with selected web files restored
from the base is a synthetic baseline; label it as such, rather than as the base
revision. Rebuild after editing or restoring those files. A browser `newPage`
wrapper can instead inject a CSS mutation with `addInitScript`; check the measured
geometry in the evidence to prove the mutation took effect. Neither technique
replaces the unmodified base/head comparison.

## Check the index without a database

The `/languages` route requires a session. Use
[nativePreviewFixture](../../../../scripts/lib/native-preview-fixture.ts) from
the checkout under review, passing the built site's origin and `'index'`:
`await nativePreviewFixture(origin, 'index')`. It returns `{ origin, close }`;
open the returned origin in Playwright and close the fixture in `finally`.

This mounts the actual `IndexView` with the built site CSS, catalogue and token
hooks. Its sign-out server action is replaced with a throwing stub: this verifies
the client view, not authentication or form submission.
[checkGalleryDefaults](../../../../scripts/lib/gallery-defaults.ts), called by
`smoke:gallery`, demonstrates desktop/mobile assertions and cleanup. Public `/`
and `/l/*` checks can use the real site through `startSite()` without a database.

## Probe built standalone previews

Serve the checkout's `public/` using
[serveDirectory](../../../../scripts/lib/browser.ts), which returns
`{ origin, close }`, or another local static server. Open
`registry/primitives/<name>/index.html?lang=<slug>` relative to that origin.
With JavaScript enabled, wait for
`document.documentElement.dataset.nxReady === 'true'` before reading the
`#nx-tokens` link's selected URL and the body's computed paint and font. The
[preview runtime](../../../../scripts/build-registry.ts) waits for its selected
stylesheet and declared fonts before marking readiness.

For Hearth dark, set `data-nx-mode="dark"` on `<html>` and inspect resolved paint
again. For before/after previews, build the registry in each revision's clone and
serve each `public/` independently. Keep probe scripts outside the checkout and
resolve packages through its `package.json`, as in the custom-data recipe.

## Clean generated output

[The ignore rules](../../../../.gitignore) cover `node_modules/`, `public/r/`,
`public/registry/`, `apps/web/{.next,public,src/generated,next-env.d.ts}`, package
`dist/` directories and `*.tsbuildinfo`. These are regenerated by installation
and builds. They also ignore local environment files, logs and caches, so
`git clean -fdX` is **not** limited to build output.

Preview ignored deletions with `git clean -ndX`. Use `git clean -fdX` only in a
disposable checkout after checking that list; otherwise remove only the generated
paths you intend to rebuild. Never delete local `.env` files as routine build
cleanup. Both commands leave tracked and unignored files alone; use
`git status --short` to check the latter separately. Keep hook configuration
separate from build cleanup.
