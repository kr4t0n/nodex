# Sketchbook

An open notebook: warm paper, handwritten text, thin ink and restrained
colored hatching. The atmosphere is exploratory; the content and controls remain
precise. This language applies to complete interfaces, including forms, prose,
navigation and data displays. Tokens supply values; these rules explain their use.

## Visual atmosphere

**Space to think.** Use open margins and a clear reading order. Separate ideas
with whitespace before adding a container. Paper and white surfaces provide quiet
hierarchy; small warm fields distinguish editable content. Surfaces remain flat.

**Controlled irregularity.** Uneven corners, faint secondary outlines and small
hatched corners give framed surfaces and primary actions a hand-drawn character.
Keep text upright, baselines aligned and interactive targets stable. Quiet actions
and plain surfaces remain clear. Never distort an entire interface to imitate handwriting.

## Color and contrast

| Role | Purpose |
| --- | --- |
| `bg`, `paper` | Warm notebook ground and plain surfaces |
| `surfaceFill`, `fieldFill` | White grouped surfaces and pale cream editable fields |
| `ink`, `border` | Black lettering and structural boundaries |
| `muted`, `faint` | Readable supporting copy on light surfaces |
| `grid` | Quiet guides and tracks, separate from structural outlines |
| `actionFill`, `actionText`, `actionBorder` | Coral actions with black text and outlines |
| `actionHoverFill`, `actionHoverBorder` | Darker coral feedback with a stable border |
| `selectionFill`, `selectionText` | Sky-blue selection with black marks |
| `badgeFill`, `badgeText` | Yellow labels with black lettering |
| `valueFill`, `valueQuietFill` | Dark green and violet progress or adjustable values |
| `seriesA`–`seriesI` | Coral, sky blue, mint, tan, lavender, pink, lime, yellow and orange categories |
| `onDarkMuted`, `onDarkFaint` | Supporting text on inverted ink surfaces |

**Category, not rank.** The accent palette is categorical. Never use its order
as a sequential intensity ramp or infer a status from a category hue. Position,
length and area carry quantitative meaning. Use exact labels for close reading.
Pastels support marks and backgrounds; use ink for lettering over them.

**State remains explicit.** Selection, error, unavailable and measured zero need
text or shape as well as color. Black outlines retain the silhouettes of pale
marks. Do not use a light hatch color for small text or a focus indicator.

## Typography

**One handwritten voice.** Gaegu supplies `font.heading` for page headings, grouped
titles and short annotations; `font.ui` for navigation, buttons, tabs, field labels,
choice labels, badges and disclosure summaries; and `font.sans` for paragraphs,
editable input/select values, supporting copy and dense tables. The role name
`font.sans` identifies reading text in the shared contract; its face is handwritten
in this language. Keep the three font stacks independent so each role can be
overridden within a scope. `font.mono` remains the system monospace stack for
commands and identifiers.

**Comfortable reading.** Body text and editable values use 16px; prose uses 14.5px.
Supporting copy stays smaller while retaining enough space for Gaegu's letterforms.
Use the supplied body variants for descriptions, summaries, notes and supporting
text. Keep the existing line-height ratios and surrounding spacing.

Headings and short UI labels are larger than reading text. Use Gaegu's supplied
regular and bold weights; avoid simulated medium or semibold handwritten type.
Use `type.cardTitle`, `type.body`, `type.control`, `type.action`, `type.uiLabel`
and `type.choice` to preserve hierarchy. UI labels use natural casing and larger
handwriting; `type.label` retains compact metrics for dense information.
`type.meterLabel` styles slider and progress labels independently of their adjacent values.
Keep headings brief and naturally wrapped.
Supporting labels must remain legible at the smallest intended container width.

## Layout and geometry

**Quiet frames.** Use compact, uneven corners and thin rules. Framed surfaces and
outlined actions may use a faint second ink outline. Keep hatching in small corners
of framed surfaces and primary actions, behind the content. `texture.outlineOpacity`
and `texture.hatchOpacity` control those accents independently; zero removes them.
Other `texture` roles set the outline inset/radii and hatch size, gap and angle.
Shadows have zero offset. Plain surfaces remain unframed. Avoid nested containers
and thick offsets.

**Accurate structure.** Maintain regular grids, meaningful alignment and native
control geometry. On small screens, wrap action groups and stack columns in
reading order. Give dense quantitative content local horizontal scrolling rather
than shrinking labels. Use spacing roles for padding and related groups.

**A stable hand.** `sketch.roughness` controls mark irregularity;
`sketch.axisRoughness` keeps axes quieter. `sketch.bowing` controls curvature.
`sketch.fillStyle` supports hachure, cross-hatch or solid; `sketch.hachureAngle`,
`sketch.hachureGap` and `sketch.fillWeight` control the fill. Preserve stable
textures when content rerenders. Hatching must not extend a measured boundary,
and roughness must never turn a zero reading into a positive mark.

## Content and interaction

**Useful wording.** Labels describe the action or value. Keep field labels
visible, explain errors nearby, and distinguish empty results from missing data.
Decorative marks do not create extra keyboard stops.

**Predictable controls.** Preserve native keyboard, form, selection and modal
behavior. Focus is an ink outline separated from the control border. Hover may
change paint; targets must not wander or tilt. Disabled controls keep their
native behavior and do not acquire active feedback.

## Motion

Use brief finite transitions for feedback and a single finite drawing phase when
data changes. Interaction timing is separate from drawing timing. No idle
redrawing, perpetual scribbles or random motion. Under reduced motion, show the
complete state and preserve the static sketch character. Preference changes
apply while the interface is open.

## Anti-patterns

- Randomizing a shape on hover or each render.
- Sketch effects that alter data positions, areas or zero baselines.
- Pastel lettering, color-only states or illegible hatch density.
- Cramped handwritten paragraphs, simulated Gaegu weights or handwriting on commands.
- Rotated controls, thick offset shadows, tonal gradients, glass or distressed overlays.
- Full-surface hatching behind reading text; use line patterns only for small accents.
- Large pill corners, excessive boxes or repeated decorative doodles.
- Missing focus feedback or animation that ignores reduced motion.
