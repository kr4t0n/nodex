# Gallery runtime

This explanation covers preview loading, token scopes and the landing interaction
contracts. Read it before changing gallery startup, layout or motion. Shared
architecture lives in [AGENTS.md](../../AGENTS.md); build and browser check commands
live in [README.md](../../README.md#verification).

## Previewing actual React

Recharts 3.10.1 emits an empty chart wrapper through `renderToStaticMarkup`, even
with explicit dimensions and animation disabled. The build therefore bundles and
mounts the actual example in Chromium. It captures the complete rendered example
as a static document, then includes a local bundle that mounts the same React
example for interaction. This is a browser snapshot followed by a client mount,
not React hydration or a second chart renderer.

Only build/test machines need Chromium. Dependencies are bundled locally;
previews have no chart-library CDN imports or runtime data fetches. Consumer
components remain client charts; their server-rendered HTML does not inherit
the standalone build-time snapshot. Do not claim general Recharts SSR support.

The website renders actual React examples in its own component tree. Before
dev/build, `sync-registry-public.ts` generates explicit lazy imports under
`apps/web/src/generated/` from each authored example entry and export, checked
against the built catalogue. The generated directory is ignored. Examples share
the website's React/Recharts runtime and helper modules; there is no per-preview
root or iframe. Keep the website and registry React types pinned to the same
version: two versions disagree about ref cleanup types when source is shared.
Next compiles imported primitive CSS and the app's Tailwind input scans registry
source. Do not eagerly import every example or make a second gallery renderer.
The production website must be rebuilt when example code changes. Standalone
preview URLs still serve browser snapshots and local bundles for independent
viewing and validation; the website uses reserved loading boxes until lazy
examples mount, not snapshot HTML injection.

Charts scale from each example's logical width in thumbnails and detail pages;
primitives render fluidly at native size.
Preserve each specimen's original proportions and standalone preview padding.
The build records preview insets outside the chart root's rendered bounds,
excluding its internal padding. The gallery translates away that standalone page
space and scales the complete root into the available width and height. Its outer
edge aligns with the title and type label above; an extra gallery gutter would
indent it again. Keep internal padding, axes, annotations and corner geometry
intact; the preview wrapper must not clip chart corners to an unscaled radius.
Primitives retain their native size and 28px preview inset. Browser checks compare
actual chart and heading bounds across languages and desktop/mobile widths.
Chart gallery cells share two subgrid rows: the title/type header and the preview.
The header distributes its title and type label to keep both aligned when titles
wrap. Three nested subgrid tracks allowed the 56px gap between cards to inflate
the label-to-preview gap; the two-row structure keeps that gap at 18px.
Older manifests without measured insets retain their original framing. Gallery titles
are supplied by the gallery/caller; existing drawing annotations and console
status chrome belong to their components. There is no chart data disclosure.

### Preview startup and measurement

Load-bearing preview behavior:

- Read an initial container width synchronously and keep the viewport-observer
  timeout fallback. Background tabs may not deliver observers promptly. The
  fallback must measure current bounds, including local clipping, instead of
  admitting every distant preview after a fixed delay.
- `preview-startup.ts` owns one page-wide queue with three concurrent startups.
  Visible examples precede the 300px preload margin; queued examples are measured
  again before admission so fast scrolling does not start stale candidates.
  Native readiness runs after the lazy component commits, fonts finish and three
  frames pass, with a timer fallback for background tabs. Only that readiness,
  an error or the 15-second failure timeout releases a startup slot. A local error
  boundary contains a failed example. Keep loaded examples mounted to retain
  interaction state. Cancel queued work and release active slots on example or
  language changes/unmount; dispose the shared
  observer, viewport listeners and fallback timers when the last preview leaves.
- Measure the native wrapper including preview padding in unscaled CSS pixels.
  Transformed client bounds would feed thumbnail scale back into layout. Accept
  only finite positive heights; grid previews keep fixed boxes for aligned labels.
- Every grid ancestor holding a scaled frame needs `min-width: 0` or its wide
  logical content can force the grid open and cancel apparent scaling.
- Native examples restate inherited font, color and text metrics within their
  token scope. Preview controls must not be nested in gallery navigation anchors;
  titles and labels own navigation. Specimen `href="#"` links stay local instead
  of scrolling the host page. Inline dialogs use the preview's query-container
  width for their former viewport sizing; they never open a page-wide modal.

## The gallery dogfoods language tokens

The shell owns layout, interaction quality and motion; the language owns paint,
type, strokes and radii. RootLayout reads the built manifest and loads default
mono-editorial tokens before first paint. Client language switching uses explicit
asset addresses. The language index scopes each tile's tokens independently.
There is no independent gallery dark mode.

`styles/scrollbars.css` owns native scrollbar presentation across the website.
The app imports it into global CSS; the registry build compiles the same file into
preview CSS so standalone documents receive it too. Resolve muted/ink paint
on each element to honor descendant token scopes. Keep transparent tracks, both
scroll axes, native interaction and forced-color defaults. Gutter reservation is
local to the terminal; do not reserve scrollbar space on every element. This is
website chrome, excluded from consumer component and token delivery.

The language token panel separates Chart colors from UI colors. It reads the
canonical token JSON through the manifest asset address, preserving ramp order
and including additional chart color roles. UI role labels describe shared
primitive semantics; they never define paint. Group equal values within each
section, retaining every role in accessible expandable lists. A chart palette
alone is incomplete: field, surface, interaction and inverse paints may be absent
from the ramp. Keep those colors visible without requiring hover.
UI swatches share one row and shrink to fit narrow screens; labels, values and
usage remain available in the expandable list and to assistive technology.

Gallery descriptions, summaries, supporting copy, notes, detail values and the
landing tagline consume the corresponding `type.body.*Size` roles. These roles
preserve the shell's previous sizes in the original languages and enlarge
Sketchbook's reading text. Keep them scoped to copy so headings and commands do
not grow with body text.

The shell still consumes curated primitive CSS classes for its existing markup.
`check:shell` checks those classes against `SHELL_PRIMITIVES` in RootLayout. Keep
the curation synchronized or a valid primitive class can render unstyled. New UI
can consume reusable primitive APIs; avoid an unrelated wholesale shell rewrite.

### Landing sequence and terminal handoff

The landing is two scenes: the name, then the CLI and chart belt together. The
terminal runs a finite typing sequence after the wordmark folds into the navbar:
`nodex list`, then `nodex init signal-console`, then a recalled command whose
language is backspaced and replaced with `neo-brutalism --force`, then another
edit of that same third prompt to `nodex init sketchbook --force`. Mono Editorial
is the initial language; Sketchbook is the fourth and final automatic design. Only completed
commands switch the page, and all four commands carry into keyboard recall.
There are only three visible command rows. The third becomes the user editor
with the completed Sketchbook command still present; it never appends a prompt.
Its language list and chart counts come from the manifest. The selected language
also determines the belt's expressive charts; never recolor another language's
charts as a substitute.

The terminal preloads generated token stylesheets and their fonts into a temporary
document scope before playing. Renaming the generated root selector preserves
the token authority and makes each switch immediate. Remove that scope and its
stylesheet on navigation. Scroll position never resets the page language or the
transcript: offscreen and background-tab playback pauses, then resumes on return.
Completion permanently hands control to an interactive terminal for the mounted
page. Unmount the animated transcript and dispose its GSAP timeline and listeners;
scrolling, theme changes and motion-preference changes must never recreate it.
There is no replay control. Reduced motion enters the interactive state directly
when the scene is reached. Keep demo typing out of React's animation-frame render
cycle and out of screen-reader live announcements.

`LandingTerminalSession` owns the inline prompt, current output and command recall.
Its parser only handles `nodex list` and `nodex init <manifest-language> [--force]`; it changes
page tokens and never executes a shell. List output also offers language buttons.
Retain the last 20 commands for Up/Down recall, preserve drafts across scrolling
and theme changes, and replace the third prompt's output on submission. Executed
commands remain in the editor for another edit; history never appends visible rows.
The handoff must not steal focus or open a mobile keyboard.
Clicking the terminal's header, transcript or padding focuses the final command
at its end without moving the page. Exclude native controls and active text
selections so language buttons, caret placement and transcript copying still work.
A text mirror reserves the demo's exact wrapping for a native textarea and shows
an idle block cursor; focus uses the native caret and selection. The idle cursor blinks only without
reduced motion. Both modes use 16px text on narrow screens to avoid mobile input
zoom. Keep the terminal's height and final command position stable at handoff so
editing cannot push the chart belt down after every command.
`TerminalBody` supplies identical demo/editor dimensions and reserves an extra
line per manifest language beyond the original four, keeping all three prompts
visible after catalogue growth. Handoff checks capture the final demo geometry
inside the browser when its theme applies; awaiting network-based assertions
before measuring can race the demo's removal.
The fixed desktop body fits all three prompts and their initial outputs; narrow
screens retain local scrolling as commands wrap.
The animated transcript uses that same fixed height and scrolls only its own
viewport to follow the current command. Both transcript and history share a thin
native scrollbar, transparent track, token-colored thumb and stable gutter; the
thumb strengthens on hover or focus. Keep wheel, touch and keyboard scrolling.
The navbar reserves room for every language's native action height.
Gallery navigation permits the back-link label to truncate at narrow widths while
retaining its full accessible name; account actions stay unshrunk. Larger UI fonts
must fit at 320px after fonts load.

### Chart belt and scene sizing

Actual registry previews fill the belt. Each repeated pass owns its trailing gap;
both passes must be identical width for seamless `xPercent: -50`. Repeat a small
catalogue to fill the belt. Reserve each frame's dimensions but mount its preview
only when the belt approaches the viewport, keeping lazy chart modules out of
the opening hero.
The terminal and belt share one scene, with a 200px chart strip below the terminal.
Terminal padding and command spacing expand on tall viewports, and the gap above
the belt grows with viewport height. The scene can grow on short screens so
content stays readable without clipping. Landing looping is an explicit product
exception; it does not relax registry motion rules.
GSAP is app-only and never enters delivered source.

### Responsive wordmark alignment

The landing sign-in aligns to the scaled wordmark in the hero and returns to the
page gutter in the navigation bar. Measure the wordmark's fractional intrinsic
width instead of estimating it from its font size, and refresh after fonts load.
Both motion paths must recompute alignment on resize; fit the wordmark inside
the viewport gutters on small screens. The tagline and sign-in label share their
first text baseline, including when the tagline wraps. The row's final transform
keeps the action at its original navbar center; measure the action as well as the
wordmark after fonts load or language metrics change. The tagline aligns with the visible left
edge of Inter's leading n using its optical inset in em, tied to the wordmark's
animated size; the text box alone includes the glyph's leading space.

### Routing boundaries

`/` reads no cookie and remains static. `/languages` and `/login` read sessions;
`/l/*` routes derive static parameters from the built manifest. Next route files
await params and pass plain values to views. `apps/web/AGENTS.md` is generated
Next guidance; [root AGENTS.md](../../AGENTS.md) remains the project architecture authority.
