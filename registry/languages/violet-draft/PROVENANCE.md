# Violet Draft source provenance

Violet Draft adapts the English [AlphaVPS](https://alphavps.com/) visual language.
The live site presented a Cloudflare challenge during the 2026-11-18 inspection;
these observations use publicly archived first-party HTML, CSS and font assets:

- [Home, 2026-11-14 18:05:45 UTC](https://web.archive.org/web/20261114180545/https://alphavps.com/).
- [Product page, 2026-11-14 00:29:30 UTC](https://web.archive.org/web/20261114002930/https://alphavps.com/cheap-vps).
- [Global CSS](https://web.archive.org/web/20261114180545id_/https://alphavps.com/assets/css/global.a4f0967f.min.css), SHA-256 `a4f0967f23b8071993623a0bac731fd54a310a73916010ed740eea09f369a439`.
- [Home CSS](https://web.archive.org/web/20261114180545id_/https://alphavps.com/assets/css/index.5b085b85.min.css), SHA-256 `5b085b85152f6201adbdba2b655b2935de9c295b061b46dc6363c04a6298e187`.
- [Product CSS](https://web.archive.org/web/20261114002930id_/https://alphavps.com/assets/css/cheap-vps.f180c863.min.css).

In the audit tables, **G** means the global stylesheet and **H** the home stylesheet.

The references show a white page with dark footer/inverse sections. A system-dark
media rule retains the white body; no site-wide mode switch was found in these
snapshots. This language therefore has only the default light mode. No logos,
illustrations, page composition, product names or marketing text are included.

## Source values and semantic mapping

These colors are literal reference values. Assigning them to Nodex's shared
semantic roles, chart series and ordered fills is a **Nodex extension**, rather
than evidence that the source offers those components or charts. `faint` uses the
source's stronger ink-3: ink-4 (`#767085`) was not retained for small labels on
`surfaceAlt`, where it measures about 4.43:1. `fieldBorder` likewise uses ink-3
instead of the faint structural rule. These accessibility mappings are **Nodex
extensions**; they do not introduce new colors.

| Nodex role                | Reference value | Source variable in G              |
| ------------------------- | --------------- | --------------------------------- |
| `color.bg`                | `#ffffff`       | `--bg`                            |
| `color.paper`             | `#ffffff`       | `--bg`                            |
| `color.surfaceFill`       | `#ffffff`       | `--bg`                            |
| `color.fieldFill`         | `#ffffff`       | `--bg`                            |
| `color.ink`               | `#141019`       | `--ink`, `--dark-bg`              |
| `color.dark`              | `#141019`       | `--ink`, `--dark-bg`              |
| `color.muted`             | `#5c5666`       | `--ink-2`                         |
| `color.faint`             | `#6f6880`       | `--ink-3`                         |
| `color.border`            | `#e7e2f2`       | `--hairline`                      |
| `color.grid`              | `#e7e2f2`       | `--hairline`                      |
| `color.plotGrid`          | `#e7e2f2`       | `--hairline`                      |
| `color.ruleSoft`          | `#efeaf8`       | `--hairline-soft`                 |
| `color.ruleDashed`        | `#c9c2dd`       | `--hairline-dash`                 |
| `color.surfaceAlt`        | `#f8f6fd`       | `--purple-soft`                   |
| `color.plotTrack`         | `#f8f6fd`       | `--purple-soft`                   |
| `color.accentTint`        | `#f4efff`       | `--purple-tint`                   |
| `color.accentEdge`        | `#d9ccf2`       | `--purple-edge`                   |
| `color.actionFill`        | `#6f42c1`       | `--purple`                        |
| `color.actionBorder`      | `#6f42c1`       | `--purple`                        |
| `color.selectionFill`     | `#6f42c1`       | `--purple`                        |
| `color.badgeFill`         | `#6f42c1`       | `--purple`                        |
| `color.actionText`        | `#ffffff`       | `--bg`                            |
| `color.selectionText`     | `#ffffff`       | `--bg`                            |
| `color.badgeText`         | `#ffffff`       | `--bg`                            |
| `color.actionHoverFill`   | `#2d0b8c`       | `--purple-hover`, `--purple-deep` |
| `color.actionHoverBorder` | `#2d0b8c`       | `--purple-hover`, `--purple-deep` |
| `color.valueFill`         | `#6f42c1`       | `--purple`                        |
| `color.valueQuietFill`    | `#6f6880`       | `--ink-3`                         |
| `color.fieldBorder`       | `#6f6880`       | `--ink-3`                         |
| `color.onDarkMuted`       | `#8d869d`       | `--dark-muted`                    |
| `color.onDarkFaint`       | `#8a8399`       | `--dark-faint`                    |
| `color.darkSurface`       | `#1d1727`       | `--dark-surface`                  |
| `color.darkHover`         | `#241d33`       | `--dark-hover`                    |
| `color.darkBorder`        | `#2a2336`       | `--dark-border`                   |
| `color.darkBorderStrong`  | `#3a3050`       | `--dark-border-2`                 |
| `color.darkLine`          | `#232030`       | `--dark-line`                     |
| `color.darkText`          | `#e6e2f0`       | `--dark-text`                     |
| `color.darkTextSecondary` | `#c9c3d6`       | `--dark-text-2`                   |
| `color.onDarkAccent`      | `#a78bfa`       | `--lavender`                      |
| `color.onDarkAccentSoft`  | `#c4b5fd`       | `--lavender-soft`                 |
| `color.success`           | `#34c759`       | `--success`                       |
| `color.successInk`        | `#17803c`       | `--success-ink`                   |
| `color.warn`              | `#f59f00`       | `--warn`                          |
| `color.warnInk`           | `#a35a00`       | `--warn-ink`                      |
| `color.seriesA`           | `#6f42c1`       | `--purple`                        |
| `color.seriesB`           | `#2d0b8c`       | `--purple-hover`, `--purple-deep` |
| `color.seriesC`           | `#141019`       | `--ink`, `--dark-bg`              |
| `color.seriesD`           | `#6f6880`       | `--ink-3`                         |
| `color.heatLow`           | `#f4efff`       | `--purple-tint`                   |
| `color.heatQuiet`         | `#d9ccf2`       | `--purple-edge`                   |
| `color.heatMiddle`        | `#a78bfa`       | `--lavender`                      |
| `color.heatStrong`        | `#6f42c1`       | `--purple`                        |
| `color.heatHigh`          | `#2d0b8c`       | `--purple-hover`, `--purple-deep` |

The ramp lists the unique retained paints; it is a **Nodex extension** for token
validation, not a source-defined chart scale.

## Fonts

The English pages use Archivo for headings and body, and IBM Plex Mono for
interface labels and quantities. The Bulgarian `html[lang=bg]` rule uses Roboto
Flex; that language-specific substitution is outside this English adaptation.

- Archivo: `@fontsource-variable/archivo@5.3.0`, Latin normal width-axis WOFF2,
  weight 100–900, stretch 62%–125%. SHA-256:
  `e3a28eade21a900c7155a247757f4b2834c07bb7ef07ad7efa55cebaac1e8f5e`.
- IBM Plex Mono: `@fontsource/ibm-plex-mono@5.3.0`, Latin normal WOFF2 at
  400, 500, 600 and 700.

These five pinned font files matched the inspected source font bytes. Both
packages carry SIL OFL 1.1 licenses. Package declarations, local embedding,
independent semantic font stacks and Latin-only coverage are **Nodex delivery
extensions**. Font licensing does not imply an affiliation with the reference.

## Source geometry and type

The following values come from the inspected rules. Their reuse for other
Nodex roles is an adaptation; all roles not listed here are identified below.

| Treatment                        | Retained value / token destination                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| Page heading                     | `type.pageTitle`: clamp(34px, 3.6vw, 54px), 800, −0.03em, 114% stretch                       |
| Panel heading                    | `type.cardTitle`: 18px, 800, normal tracking, 110% stretch                                   |
| Body                             | `type.body.size` 15px, `lineHeight` 1.65                                                     |
| Supporting subtitle              | `type.subtitle`: 12.5px, 400, muted, 1.55                                                    |
| Primary action text              | `type.action`: 13px, 700, 1.5px tracking, normal leading                                     |
| Short labels                     | `type.label`, `type.caption`, `type.uiLabel`: 11px, 600, 1.5px tracking; UI labels uppercase |
| Prominent quantity               | `type.stat.size` 38px, `tracking` −0.03em                                                    |
| Panel padding                    | `space.cardPadding` 26px 24px 22px                                                           |
| Panel body gap                   | `space.cardBodyGap` 14px                                                                     |
| Adjoining grid                   | `space.gridGap` 0px                                                                          |
| Wide page gutter                 | `space.pagePadding` 40px; 20px mobile guidance                                               |
| Primary / compact action padding | `space.actionPadding` 17px 30px / `compactActionPadding` 13px 22px                           |
| Action internal gap              | `space.actionGap` 10px                                                                       |
| Square geometry                  | All rectangular `radius` roles 0px; no surface shadows                                       |
| Cut action                       | `shape.actionClip` 12px lower-right cut; `actionCompactClip` 10px                            |
| Diagonal hover                   | `shape.actionSweep*`: 105°, 50%/50.35% split, 240% 100% background, opacity 1                |
| Primary hover timing             | `motion.action`: 320ms cubic-bezier(.2, 0, 0, 1)                                             |
| Ordinary feedback                | `motion.control`: 150ms ease                                                                 |
| Disclosure feedback              | `motion.disclosure`: 200ms ease                                                              |
| Fine rules / emphasized lines    | `stroke.hairline` 1px; `mark`, `emphasis`, `lineMax` 2px                                     |

## Nodex extensions

All remaining values and behaviors are **Nodex extensions**, not an extraction
claim. In particular:

- The name, slug, catalogue identity, three chart forms and all fictional examples.
  Numeric-X positioning, missing-value gaps, zero-based bars, keyboard inspection,
  fixed five-bin matrix mapping and unavailable-cell marks are new chart behavior.
- Readable 12px axes, legends and plot values; 16px editable text and 1.4 leading;
  1.65 multiline leading; 28px/48px quantity variants. These map the source's
  typography onto control and chart contexts absent from the reference.
- `font.weight`, `font.weights`, all `type.prose` roles (including 114% heading
  stretch, natural case and 15px/1.65 reading text), and all other type leaves
  except those explicitly listed in the source table above. Remaining scales
  start from Mono Editorial at `40380b1` and are not attributed to AlphaVPS.
- `space.controlPadding` 12px 14px and all remaining space roles except the
  source rows above. The latter retain the shared scaffold's values from
  `40380b1`; they give all 24 primitives a complete, editable contract.
- Zero shadow geometry, disabled textures, and the retained inactive texture
  dimensions. Circular native marks remain local functional geometry.
- Zero-duration chart `draw`, `pop`, `fade`; the retained reveal threshold;
  all interaction timings other than `control`, `disclosure`, `action`; zero
  press travel. Other control roles reuse 150ms ease as a deliberate adaptation.
- `shape.actionPaintOpacity` selects clipped paint while other languages retain
  their native paint at fractional border widths. Paint-only clipping, full native hit boxes and focus outlines, reduced-motion
  behavior, forced-colors fallback and separate field boundaries.

`tokens.json` remains the sole machine-readable authority. This record separates
reference evidence from adaptations; it does not define a second theme.

## Complete non-color token audit

This final role/value list includes scaffold defaults. Source labels identify
the measured rule; every other row is explicitly a Nodex extension. Arrays
and font assets are metadata, not emitted CSS variables.

<!-- Keep the complete audit compact instead of padding every row to its longest CSS value. -->
<!-- prettier-ignore -->
| Token path | Final value | Origin / treatment |
| --- | --- | --- |
| `ramp.steps` | `["#ffffff", "#141019", "#5c5666", "#6f6880", "#e7e2f2", "#efeaf8", "#c9c2dd", "#f8f6fd", "#f4efff", "#d9ccf2", "#6f42c1", "#2d0b8c", "#8d869d", "#8a8399", "#1d1727", "#241d33", "#2a2336", "#3a3050", "#232030", "#e6e2f0", "#c9c3d6", "#a78bfa", "#c4b5fd", "#34c759", "#17803c", "#f59f00", "#a35a00"]` | **Nodex extension** (see the categories above) |
| `stroke.hairline` | `1px` | Panel and ledger borders |
| `stroke.mark` | `2px` | **Nodex extension** (see the categories above) |
| `stroke.emphasis` | `2px` | **Nodex extension** (see the categories above) |
| `stroke.lineMax` | `2px` | **Nodex extension** (see the categories above) |
| `radius.card` | `0px` | **Nodex extension** (see the categories above) |
| `radius.pill` | `0px` | **Nodex extension** (see the categories above) |
| `radius.checkbox` | `0px` | **Nodex extension** (see the categories above) |
| `radius.code` | `0px` | **Nodex extension** (see the categories above) |
| `radius.tooltip` | `0px` | **Nodex extension** (see the categories above) |
| `radius.focus` | `0px` | **Nodex extension** (see the categories above) |
| `radius.heatCell` | `0px` | **Nodex extension** (see the categories above) |
| `radius.heatCellLarge` | `0px` | **Nodex extension** (see the categories above) |
| `radius.rankCell` | `0px` | **Nodex extension** (see the categories above) |
| `radius.avatar` | `0px` | **Nodex extension** (see the categories above) |
| `font.heading` | `'Archivo', ui-sans-serif, system-ui, sans-serif` | G `--font-sans`; independent fallback stack is a Nodex extension |
| `font.sans` | `'Archivo', ui-sans-serif, system-ui, sans-serif` | G `--font-sans`; independent fallback stack is a Nodex extension |
| `font.ui` | `'IBM Plex Mono', ui-monospace, monospace` | G `--font-mono`; independent fallback stack is a Nodex extension |
| `font.mono` | `'IBM Plex Mono', ui-monospace, monospace` | G `--font-mono`; independent fallback stack is a Nodex extension |
| `font.weights` | `[400, 500, 600, 700, 800]` | **Nodex extension** (see the categories above) |
| `font.weight.medium` | `500` | **Nodex extension** (see the categories above) |
| `font.weight.semibold` | `600` | **Nodex extension** (see the categories above) |
| `font.weight.bold` | `700` | **Nodex extension** (see the categories above) |
| `font.faces[0].package` | `@fontsource-variable/archivo@5.3.0` | **Nodex extension** (see the categories above) |
| `font.faces[0].file` | `files/archivo-latin-wdth-normal.woff2` | **Nodex extension** (see the categories above) |
| `font.faces[0].family` | `Archivo` | **Nodex extension** (see the categories above) |
| `font.faces[0].weight` | `100 900` | **Nodex extension** (see the categories above) |
| `font.faces[0].style` | `normal` | **Nodex extension** (see the categories above) |
| `font.faces[0].stretch` | `62% 125%` | **Nodex extension** (see the categories above) |
| `font.faces[1].package` | `@fontsource/ibm-plex-mono@5.3.0` | **Nodex extension** (see the categories above) |
| `font.faces[1].file` | `files/ibm-plex-mono-latin-400-normal.woff2` | **Nodex extension** (see the categories above) |
| `font.faces[1].family` | `IBM Plex Mono` | **Nodex extension** (see the categories above) |
| `font.faces[1].weight` | `400` | **Nodex extension** (see the categories above) |
| `font.faces[1].style` | `normal` | **Nodex extension** (see the categories above) |
| `font.faces[2].package` | `@fontsource/ibm-plex-mono@5.3.0` | **Nodex extension** (see the categories above) |
| `font.faces[2].file` | `files/ibm-plex-mono-latin-500-normal.woff2` | **Nodex extension** (see the categories above) |
| `font.faces[2].family` | `IBM Plex Mono` | **Nodex extension** (see the categories above) |
| `font.faces[2].weight` | `500` | **Nodex extension** (see the categories above) |
| `font.faces[2].style` | `normal` | **Nodex extension** (see the categories above) |
| `font.faces[3].package` | `@fontsource/ibm-plex-mono@5.3.0` | **Nodex extension** (see the categories above) |
| `font.faces[3].file` | `files/ibm-plex-mono-latin-600-normal.woff2` | **Nodex extension** (see the categories above) |
| `font.faces[3].family` | `IBM Plex Mono` | **Nodex extension** (see the categories above) |
| `font.faces[3].weight` | `600` | **Nodex extension** (see the categories above) |
| `font.faces[3].style` | `normal` | **Nodex extension** (see the categories above) |
| `font.faces[4].package` | `@fontsource/ibm-plex-mono@5.3.0` | **Nodex extension** (see the categories above) |
| `font.faces[4].file` | `files/ibm-plex-mono-latin-700-normal.woff2` | **Nodex extension** (see the categories above) |
| `font.faces[4].family` | `IBM Plex Mono` | **Nodex extension** (see the categories above) |
| `font.faces[4].weight` | `700` | **Nodex extension** (see the categories above) |
| `font.faces[4].style` | `normal` | **Nodex extension** (see the categories above) |
| `type.plotValue.size` | `12px` | **Nodex extension** (see the categories above) |
| `type.plotValue.weight` | `400` | **Nodex extension** (see the categories above) |
| `type.pageTitle.size` | `clamp(34px, 3.6vw, 54px)` | G `.display-h2` |
| `type.pageTitle.weight` | `800` | G `.display-h2` |
| `type.pageTitle.tracking` | `-0.03em` | G `.display-h2` |
| `type.pageTitle.lineHeight` | `1` | G `.display-h2` |
| `type.pageTitle.stretch` | `114%` | G `.display-h2` |
| `type.cardTitle.size` | `18px` | H `.pcard__h` |
| `type.cardTitle.weight` | `800` | H `.pcard__h` |
| `type.cardTitle.tracking` | `normal` | H `.pcard__h` |
| `type.cardTitle.stretch` | `110%` | H `.pcard__h` |
| `type.subtitle.size` | `12.5px` | H `.pcard__d` |
| `type.subtitle.weight` | `400` | H `.pcard__d` |
| `type.subtitle.color` | `muted` | H `.pcard__d` |
| `type.subtitle.lineHeight` | `1.55` | H `.pcard__d` |
| `type.note.size` | `11px` | **Nodex extension** (see the categories above) |
| `type.note.lineHeight` | `1.65` | **Nodex extension** (see the categories above) |
| `type.legend.size` | `12px` | **Nodex extension** (see the categories above) |
| `type.legend.weight` | `400` | **Nodex extension** (see the categories above) |
| `type.legend.tracking` | `0.1em` | **Nodex extension** (see the categories above) |
| `type.caption.size` | `11px` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.caption.weight` | `600` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.caption.tracking` | `1.5px` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.axis.size` | `12px` | **Nodex extension** (see the categories above) |
| `type.axis.weight` | `400` | **Nodex extension** (see the categories above) |
| `type.action.size` | `13px` | G `.btn-primary` |
| `type.action.weight` | `700` | G `.btn-primary` |
| `type.action.tracking` | `1.5px` | G `.btn-primary` |
| `type.action.lineHeight` | `normal` | G `.btn-primary` |
| `type.control.size` | `16px` | **Nodex extension** (see the categories above) |
| `type.control.lineHeight` | `1.4` | **Nodex extension** (see the categories above) |
| `type.control.multilineLineHeight` | `1.65` | **Nodex extension** (see the categories above) |
| `type.label.size` | `11px` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.label.weight` | `600` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.label.tracking` | `1.5px` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.body.size` | `15px` | G `.section-lede` |
| `type.body.lineHeight` | `1.65` | G `.section-lede` |
| `type.body.descriptionSize` | `13px` | **Nodex extension** (see the categories above) |
| `type.body.summarySize` | `12px` | **Nodex extension** (see the categories above) |
| `type.body.supportingSize` | `10.5px` | **Nodex extension** (see the categories above) |
| `type.body.noteSize` | `11px` | **Nodex extension** (see the categories above) |
| `type.body.detailSize` | `11.5px` | **Nodex extension** (see the categories above) |
| `type.body.taglineSize` | `14px` | **Nodex extension** (see the categories above) |
| `type.help.size` | `10.5px` | **Nodex extension** (see the categories above) |
| `type.help.lineHeight` | `1.5` | **Nodex extension** (see the categories above) |
| `type.badge.lineHeight` | `1.6` | **Nodex extension** (see the categories above) |
| `type.disclosure.size` | `12.5px` | **Nodex extension** (see the categories above) |
| `type.disclosure.weight` | `600` | **Nodex extension** (see the categories above) |
| `type.disclosure.lineHeight` | `1.5` | **Nodex extension** (see the categories above) |
| `type.disclosure.bodyLineHeight` | `1.75` | **Nodex extension** (see the categories above) |
| `type.emptyTitle.size` | `15px` | **Nodex extension** (see the categories above) |
| `type.avatar.size` | `10px` | **Nodex extension** (see the categories above) |
| `type.avatar.smallSize` | `8px` | **Nodex extension** (see the categories above) |
| `type.avatar.largeSize` | `13px` | **Nodex extension** (see the categories above) |
| `type.avatar.countSize` | `9px` | **Nodex extension** (see the categories above) |
| `type.avatar.tracking` | `0.04em` | **Nodex extension** (see the categories above) |
| `type.code.inlineSize` | `0.88em` | **Nodex extension** (see the categories above) |
| `type.code.keySize` | `0.82em` | **Nodex extension** (see the categories above) |
| `type.code.keyLineHeight` | `1.5` | **Nodex extension** (see the categories above) |
| `type.code.blockSize` | `11px` | **Nodex extension** (see the categories above) |
| `type.code.blockLineHeight` | `1.7` | **Nodex extension** (see the categories above) |
| `type.code.commandSize` | `11.5px` | **Nodex extension** (see the categories above) |
| `type.code.commandLineHeight` | `1.6` | **Nodex extension** (see the categories above) |
| `type.prose.size` | `15px` | **Nodex extension** (see the categories above) |
| `type.prose.lineHeight` | `1.65` | **Nodex extension** (see the categories above) |
| `type.prose.titleSize` | `19px` | **Nodex extension** (see the categories above) |
| `type.prose.titleWeight` | `800` | **Nodex extension** (see the categories above) |
| `type.prose.headingTracking` | `-0.02em` | **Nodex extension** (see the categories above) |
| `type.prose.sectionSize` | `13px` | **Nodex extension** (see the categories above) |
| `type.prose.sectionTracking` | `0.06em` | **Nodex extension** (see the categories above) |
| `type.prose.subheadingSize` | `12.5px` | **Nodex extension** (see the categories above) |
| `type.prose.minorHeadingSize` | `12px` | **Nodex extension** (see the categories above) |
| `type.prose.narrowSize` | `11px` | **Nodex extension** (see the categories above) |
| `type.prose.narrowLineHeight` | `1.7` | **Nodex extension** (see the categories above) |
| `type.prose.sectionTransform` | `none` | **Nodex extension** (see the categories above) |
| `type.prose.headingLineHeight` | `inherit` | **Nodex extension** (see the categories above) |
| `type.prose.headingStretch` | `114%` | **Nodex extension** (see the categories above) |
| `type.stat.size` | `38px` | H `.stats__num` |
| `type.stat.smallSize` | `28px` | **Nodex extension** (see the categories above) |
| `type.stat.largeSize` | `48px` | **Nodex extension** (see the categories above) |
| `type.stat.tracking` | `-0.03em` | H `.stats__num` |
| `type.stat.smallTracking` | `-0.02em` | **Nodex extension** (see the categories above) |
| `type.stat.largeTracking` | `-0.035em` | **Nodex extension** (see the categories above) |
| `type.stat.lineHeight` | `1.05` | **Nodex extension** (see the categories above) |
| `type.stat.unitSize` | `0.55em` | **Nodex extension** (see the categories above) |
| `type.stat.deltaSize` | `10.5px` | **Nodex extension** (see the categories above) |
| `type.status.size` | `11px` | **Nodex extension** (see the categories above) |
| `type.status.lineHeight` | `1.4` | **Nodex extension** (see the categories above) |
| `type.tooltip.size` | `10.5px` | **Nodex extension** (see the categories above) |
| `type.tooltip.weight` | `500` | **Nodex extension** (see the categories above) |
| `type.tooltip.lineHeight` | `1.45` | **Nodex extension** (see the categories above) |
| `type.tooltip.tracking` | `0.01em` | **Nodex extension** (see the categories above) |
| `type.choice.size` | `12px` | **Nodex extension** (see the categories above) |
| `type.choice.lineHeight` | `1.4` | **Nodex extension** (see the categories above) |
| `type.choice.weight` | `400` | **Nodex extension** (see the categories above) |
| `type.uiLabel.size` | `11px` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.uiLabel.weight` | `600` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.uiLabel.tracking` | `1.5px` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.uiLabel.transform` | `uppercase` | G `.mono-label` / `.eyebrow-row__label`; shared-scale mapping is a Nodex extension |
| `type.meterLabel.size` | `9.5px` | **Nodex extension** (see the categories above) |
| `type.meterLabel.weight` | `500` | **Nodex extension** (see the categories above) |
| `type.meterLabel.tracking` | `0.08em` | **Nodex extension** (see the categories above) |
| `type.meterLabel.transform` | `uppercase` | **Nodex extension** (see the categories above) |
| `space.cardPadding` | `26px 24px 22px` | H `.pcard` |
| `space.gridGap` | `0px` | H product grid |
| `space.pagePadding` | `40px` | G `--container-pad` |
| `space.fieldGap` | `6px` | **Nodex extension** (see the categories above) |
| `space.controlPadding` | `12px 14px` | **Nodex extension** (see the categories above) |
| `space.textareaPadding` | `0.7em 0.95em` | **Nodex extension** (see the categories above) |
| `space.actionPadding` | `17px 30px` | G `.btn-primary` |
| `space.actionGap` | `10px` | G `.btn-primary` |
| `space.quietActionPaddingInline` | `0.5em` | **Nodex extension** (see the categories above) |
| `space.compactActionPadding` | `13px 22px` | G medium action |
| `space.choiceGap` | `0.65em` | **Nodex extension** (see the categories above) |
| `space.choiceGroupGap` | `0.7em` | **Nodex extension** (see the categories above) |
| `space.choiceRowGap` | `1.1em` | **Nodex extension** (see the categories above) |
| `space.choiceSpreadGap` | `1.5em` | **Nodex extension** (see the categories above) |
| `space.labelValueGap` | `1em` | **Nodex extension** (see the categories above) |
| `space.badgePadding` | `3px 10px` | **Nodex extension** (see the categories above) |
| `space.badgeGap` | `0.4em` | **Nodex extension** (see the categories above) |
| `space.cardBodyGap` | `14px` | H `.pcard` |
| `space.captionGap` | `12px` | **Nodex extension** (see the categories above) |
| `space.subtitleGap` | `3px` | **Nodex extension** (see the categories above) |
| `space.alertPadding` | `12px 0 12px 14px` | **Nodex extension** (see the categories above) |
| `space.alertGap` | `0.35em` | **Nodex extension** (see the categories above) |
| `space.avatarOverlap` | `8px` | **Nodex extension** (see the categories above) |
| `space.inlineCodePadding` | `0.15em 0.4em` | **Nodex extension** (see the categories above) |
| `space.keyPadding` | `0.1em 0.4em` | **Nodex extension** (see the categories above) |
| `space.codeBlockPadding` | `14px 16px` | **Nodex extension** (see the categories above) |
| `space.commandPadding` | `0.55em 0.9em` | **Nodex extension** (see the categories above) |
| `space.commandGap` | `0.8em` | **Nodex extension** (see the categories above) |
| `space.disclosurePadding` | `12px 0` | **Nodex extension** (see the categories above) |
| `space.disclosureGap` | `0.8em` | **Nodex extension** (see the categories above) |
| `space.disclosureBodyPadding` | `0 0 16px` | **Nodex extension** (see the categories above) |
| `space.dialogBodyPadding` | `22px 24px 20px` | **Nodex extension** (see the categories above) |
| `space.dialogActionsPadding` | `14px 24px` | **Nodex extension** (see the categories above) |
| `space.dialogGap` | `8px` | **Nodex extension** (see the categories above) |
| `space.emptyPadding` | `30px 28px` | **Nodex extension** (see the categories above) |
| `space.emptyCenteredPadding` | `52px 28px` | **Nodex extension** (see the categories above) |
| `space.emptyQuietPadding` | `20px 0` | **Nodex extension** (see the categories above) |
| `space.emptyGap` | `10px` | **Nodex extension** (see the categories above) |
| `space.emptyActionGap` | `4px` | **Nodex extension** (see the categories above) |
| `space.linkUnderlineOffset` | `0.22em` | **Nodex extension** (see the categories above) |
| `space.linkIconGap` | `0.35em` | **Nodex extension** (see the categories above) |
| `space.proseFlowGap` | `0.9em` | **Nodex extension** (see the categories above) |
| `space.proseSectionGap` | `2em` | **Nodex extension** (see the categories above) |
| `space.proseSubheadingGap` | `1.6em` | **Nodex extension** (see the categories above) |
| `space.proseMinorHeadingGap` | `1.4em` | **Nodex extension** (see the categories above) |
| `space.proseIndent` | `1.1em` | **Nodex extension** (see the categories above) |
| `space.proseListGap` | `0.35em` | **Nodex extension** (see the categories above) |
| `space.proseRuleGap` | `1.8em` | **Nodex extension** (see the categories above) |
| `space.proseTablePadding` | `6px 12px 6px 0` | **Nodex extension** (see the categories above) |
| `space.ruleInlineGap` | `0.9em` | **Nodex extension** (see the categories above) |
| `space.ruleInset` | `1.2em` | **Nodex extension** (see the categories above) |
| `space.selectIndicatorPadding` | `2.2em` | **Nodex extension** (see the categories above) |
| `space.selectGap` | `0.7em` | **Nodex extension** (see the categories above) |
| `space.pickerPadding` | `6px` | **Nodex extension** (see the categories above) |
| `space.pickerOffset` | `6px` | **Nodex extension** (see the categories above) |
| `space.optionPadding` | `7px 12px` | **Nodex extension** (see the categories above) |
| `space.sliderFieldGap` | `5px` | **Nodex extension** (see the categories above) |
| `space.sliderTickGap` | `2px` | **Nodex extension** (see the categories above) |
| `space.statGap` | `5px` | **Nodex extension** (see the categories above) |
| `space.statUnitGap` | `0.15em` | **Nodex extension** (see the categories above) |
| `space.statDeltaGap` | `0.35em` | **Nodex extension** (see the categories above) |
| `space.statGroupGap` | `28px` | **Nodex extension** (see the categories above) |
| `space.statStackPadding` | `14px 0` | **Nodex extension** (see the categories above) |
| `space.statusGap` | `0.55em` | **Nodex extension** (see the categories above) |
| `space.statusBlockPadding` | `26px 0` | **Nodex extension** (see the categories above) |
| `space.tableHeadPadding` | `8px 14px 8px 0` | **Nodex extension** (see the categories above) |
| `space.tableCellPadding` | `9px 14px 9px 0` | **Nodex extension** (see the categories above) |
| `space.tooltipPadding` | `5px 9px` | **Nodex extension** (see the categories above) |
| `space.tooltipOffset` | `7px` | **Nodex extension** (see the categories above) |
| `motion.draw.duration` | `0s` | **Nodex extension** (see the categories above) |
| `motion.draw.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.pop.duration` | `0s` | **Nodex extension** (see the categories above) |
| `motion.pop.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.fade.duration` | `0s` | **Nodex extension** (see the categories above) |
| `motion.fade.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.revealThreshold` | `0.3` | **Nodex extension** (see the categories above) |
| `motion.control.duration` | `150ms` | G `--ease-fast` |
| `motion.control.easing` | `ease` | G `--ease-fast` |
| `motion.toggle.duration` | `150ms` | **Nodex extension** (see the categories above) |
| `motion.toggle.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.mark.duration` | `150ms` | **Nodex extension** (see the categories above) |
| `motion.mark.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.press.duration` | `150ms` | **Nodex extension** (see the categories above) |
| `motion.press.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.press.x` | `0px` | **Nodex extension** (see the categories above) |
| `motion.press.y` | `0px` | **Nodex extension** (see the categories above) |
| `motion.surface.duration` | `150ms` | **Nodex extension** (see the categories above) |
| `motion.surface.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.disclosure.duration` | `200ms` | G `--ease-menu` |
| `motion.disclosure.easing` | `ease` | G `--ease-menu` |
| `motion.progress.duration` | `150ms` | **Nodex extension** (see the categories above) |
| `motion.progress.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.tooltip.duration` | `150ms` | **Nodex extension** (see the categories above) |
| `motion.tooltip.easing` | `ease` | **Nodex extension** (see the categories above) |
| `motion.action.duration` | `320ms` | G `.btn-primary` |
| `motion.action.easing` | `cubic-bezier(.2, 0, 0, 1)` | G `.btn-primary` |
| `shadow.action` | `0px 0px 0px` | **Nodex extension** (see the categories above) |
| `shadow.actionPressed` | `0px 0px 0px` | **Nodex extension** (see the categories above) |
| `shadow.control` | `0px 0px 0px` | **Nodex extension** (see the categories above) |
| `shadow.badge` | `0px 0px 0px` | **Nodex extension** (see the categories above) |
| `shadow.surface` | `0px 0px 0px` | **Nodex extension** (see the categories above) |
| `shadow.popover` | `0px 0px 0px` | **Nodex extension** (see the categories above) |
| `texture.outlineOpacity` | `0` | **Nodex extension** (see the categories above) |
| `texture.outlineInset` | `1px 2px 2px 1px` | **Nodex extension** (see the categories above) |
| `texture.outlineRadius` | `7px 4px 8px 3px / 3px 8px 4px 7px` | **Nodex extension** (see the categories above) |
| `texture.hatchOpacity` | `0` | **Nodex extension** (see the categories above) |
| `texture.hatchSize` | `24px` | **Nodex extension** (see the categories above) |
| `texture.hatchGap` | `5px` | **Nodex extension** (see the categories above) |
| `texture.hatchAngle` | `-41deg` | **Nodex extension** (see the categories above) |
| `shape.actionClip` | `polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)` | G `--chamfer-cut-lg` |
| `shape.actionCompactClip` | `polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)` | G `--chamfer-cut` |
| `shape.actionSweepOpacity` | `1` | **Nodex extension** (see the categories above) |
| `shape.actionSweepAngle` | `105deg` | G `.btn-primary`; token decomposition is a Nodex extension |
| `shape.actionSweepStart` | `50%` | G `.btn-primary`; token decomposition is a Nodex extension |
| `shape.actionSweepEnd` | `50.35%` | G `.btn-primary`; token decomposition is a Nodex extension |
| `shape.actionSweepSize` | `240% 100%` | G `.btn-primary`; token decomposition is a Nodex extension |
| `shape.actionPaintOpacity` | `1` | **Nodex extension** (see the categories above) |
