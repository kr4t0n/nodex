# Neo-brutalism

Bold typography, visible construction and playful color blocks on warm paper.
Interfaces feel like printed matter assembled into a working tool: direct,
substantial and deliberately uncomplicated.

This language applies to complete interfaces, including navigation, forms,
controls, prose and data displays. The tokens are the authority for values;
this document defines the relationships between them.

## Visual atmosphere

**Structure before decoration.** Rectangular surfaces, dark outlines and offset
shadows establish hierarchy. A clear reading order and a consistent grid carry
the composition. The roughness is in the visual language, never in usability.

**Color with a role.** Lilac panels, yellow actions, pink badges and mint
selections make the interface visibly colorful. Blue marks progress and adjustable
values; warm cream distinguishes editable fields. Repeat these assignments across
the page so hue reinforces function. Warm paper separates the colored groups.

**Comfortable density.** Bold outlines need room. Use open margins, compact
related groups and deliberate separation between sections. A page should read
as a small number of strong regions before its details become visible.

## Color and contrast

| Semantic role | Intended use |
| --- | --- |
| `--nx-bg`, `--nx-paper` | Warm ivory page ground and plain surfaces |
| `--nx-surfaceFill` | Lilac panels and dialogs |
| `--nx-fieldFill` | Warm cream fields and their option pickers |
| `--nx-ink` | Primary text, outlines and the color of hard shadows |
| `--nx-border` | Dark structural outlines and dividers |
| `--nx-grid` | Quiet blue tracks and supporting fills; never the main outline |
| `--nx-muted`, `--nx-faint` | Readable secondary copy and captions on paper |
| `--nx-actionFill`, `--nx-actionText` | Yellow primary action with ink lettering |
| `--nx-actionBorder` | The independent outline around a primary action |
| `--nx-actionHoverFill`, `--nx-actionHoverBorder` | A stronger yellow fill and a stable dark outline on hover |
| `--nx-selectionFill`, `--nx-selectionText` | Mint checked or selected states with ink marks and lettering |
| `--nx-badgeFill`, `--nx-badgeText` | Pink solid badges with ink lettering |
| `--nx-valueFill`, `--nx-valueQuietFill` | Blue value marks and violet secondary progress |
| `--nx-accent` | Yellow emphasis outside the action itself |
| `--nx-accentSecondary` | Lilac for a supporting group or category |
| `--nx-accentTertiary` | Mint for another supporting group or category |
| `--nx-seriesA` through `--nx-seriesD` | Yellow, lilac, mint and pink categorical data marks; keep category assignments stable |
| `--nx-onDarkMuted`, `--nx-onDarkFaint` | Supporting text on inverted ink surfaces |

Yellow, lilac, mint and pink fills take ink text. Keep supporting text dark
enough to read on both paper and lilac. Cream fields retain ink values and
dark supporting copy. Blue and violet value marks carry magnitude rather than
text. Use the inverse text roles on dark surfaces.

The accent palette is categorical, not an ordered magnitude scale. Mint denotes
selection, not success; pink distinguishes a badge, not an error. The shape,
position, text and native state of each control retain the meaning when hue
cannot be distinguished. Color is never the only indication of state.

Data marks use the series roles independently of actions, selections and badges.
Position and size carry quantity; color carries category identity. Keep a shared
zero baseline for bars, label values directly and distinguish measured zero from
unavailable observations. Hard shadows sit behind marks as decoration and never
extend the measured front face.

## Typography

**Primary voice.** Space Grotesk supplies the headings, interface text and
numerals. Use its actual weights from 400 to 700. Headings are heavy and tightly
tracked; body text remains regular, with enough line height for continuous
reading. Avoid simulated heavier weights.

**Technical voice.** JetBrains Mono is reserved for code, identifiers and
literal commands. Do not apply monospace to all labels or all body copy.

Use the semantic type roles: `pageTitle` for the page, `cardTitle` for a grouped
surface, `action` for buttons, `control` for field values, and `label`, `caption`
and `help` for their respective context. Statistics may use the larger `stat`
scale; a supporting count should not compete with the page heading.

Uppercase is appropriate for short labels and captions. Keep sentences in
sentence case. Give headings a useful measure and let them wrap naturally;
large type must not force horizontal scrolling or obscure adjacent actions.

## Layout and geometry

**Visible edges.** Structural outlines use `stroke.hairline`, which is a bold
rule in this language despite the shared role's name. Use `stroke.mark` and
`stroke.emphasis` for progressively stronger marks. Thickness is consistent
within each role, rather than chosen separately for every element.

**Compact corners.** Surfaces use an 8px radius and controls use 4px. These small
rounds keep the rectangular silhouette and strong edges while separating the
language from a rigid terminal aesthetic. The small checkbox radius supports its
native mark; circular controls keep their functional geometry. Do not turn panels
or primary actions into pills. Quantitative marks can retain square edges.

**Hard shadows.** Actions, fields, badges, surfaces and popovers each have their own
`shadow` role. These values contain offset geometry only, with zero blur.
Apply the ink token alongside the geometry on the element itself. This keeps
a local ink override capable of recoloring the shadow. Never capture ink inside
an inherited shadow alias.

Actions and fields share a 4px offset; grouped surfaces use 6px. Solid and
outlined badges use a smaller 2px offset so they read as attached labels.
Dashed and quiet badges remain flat and never move like interactive controls.

**Space for the offset.** Reserve room to the right and below a shadow. Use
the spacing roles for padding and gaps; a shadow must not overlap the next
control, disappear behind clipping, or create horizontal page overflow.
Plain surfaces retain the paper background and remain borderless and shadowless.

Align headings, form labels, fields and supporting text to shared edges. On
narrow screens, collapse columns in reading order and allow action groups to
wrap. Keep controls large enough for their contents and interaction targets;
do not compress the type to preserve a desktop arrangement. Default actions and
single-line fields pair 14px type with padding that gives them at least 44px of
height. Compact actions are reserved for dense secondary toolbars.

## Content and interaction

**Direct language.** Action labels name the result. Field labels remain visible
after entry, and errors explain the correction. Empty, unavailable, loading and
measured zero are distinct states, each with appropriate wording.

**Tactile actions.** Primary and outlined buttons cast hard shadows. A press
moves the button the full shadow offset and consumes the remaining shadow; release
restores it. Secondary and quiet controls remain visibly lower in emphasis.
Disabled controls do not move or acquire hover feedback.

**Native behavior.** Preserve keyboard operation, submission, selection, focus
return and dismissal. Focus uses a visible ink outline with clear separation
from the control border. A shadow is never the only focus indicator. Status
messages and decorative badges must not pretend to be clickable actions.

## Motion

Motion is brief and tied to feedback. Use the control, press, toggle, surface,
disclosure, progress and tooltip roles for their respective interactions.
Data drawing has its own duration; it must not slow down a button response.

No bounce, decorative wobble, perpetual rotation or idle pulsing. Content should
be available immediately rather than held behind a staged entrance.

Respect reduced motion whenever the preference changes. Buttons retain their
resting geometry and shadow while pressed; controls still communicate state
through text, borders and color. Resolve animation to the complete state.

## Anti-patterns

- Blurred elevation shadows, glowing edges, translucent glass or soft gradients.
- Oversized corner radii, pill-shaped primary actions, hairline outlines or decorative tilting.
- Arbitrary colors within the same control role, low-contrast accent lettering
  or color blocks without room between them.
- Applying the quiet grid color to the main structural outline.
- Tiny uppercase prose, simulated font weights or cropped headings.
- Nested boxes whose borders and shadows compete with their content.
- Hover or press movement on disabled controls, or motion that survives the
  reduced-motion preference.
- Missing focus indicators, placeholder-only labels or color-only state.
- Repeating literal theme values in component styles instead of consuming roles.
