# Soft Studio

Calm, colorful interfaces with rounded geometry and comfortable typography.
The atmosphere is approachable and composed: clear content, generous controls
and quiet surfaces that support everyday work. This foundation applies to pages,
navigation, forms, prose and data displays. `tokens.json` is the value authority.

## Visual atmosphere

**Comfortable density.** Give each group a clear heading and enough surrounding
space to read it. Keep related controls close and separate different tasks with
whitespace. A surface should hold a meaningful group, not every fragment of text.

**Soft boundaries.** Rounded silhouettes and pale surface changes establish
hierarchy. Small diffuse shadows lift framed surfaces and popovers. Fields,
badges and plain content remain flat. Keep text crisp and alignment precise.

**Useful color.** Cobalt identifies primary actions and selection. Teal supports
progress, while pale blue distinguishes badges. Data categories have their own
stable colors. A colorful page still needs an obvious primary action.

## Color and contrast

| Role | Meaning |
| --- | --- |
| `bg`, `paper` | Cool off-white page ground and plain surfaces |
| `surfaceFill` | White grouped surfaces and dialogs |
| `fieldFill` | Cool tinted editable fields and their option pickers |
| `ink`, `muted`, `faint` | Primary, supporting and minor text |
| `border` | Structural and control boundaries |
| `grid` | Quiet separators, tracks and plot guides |
| `actionFill`, `actionText`, `actionBorder` | Cobalt actions with white lettering |
| `actionHoverFill`, `actionHoverBorder` | Deeper cobalt hover feedback |
| `selectionFill`, `selectionText` | Selected controls and their white marks |
| `badgeFill`, `badgeText` | Pale blue labels with readable blue text |
| `valueFill`, `valueQuietFill` | Teal progress and supporting lavender values |
| `seriesA`–`seriesD` | Blue, teal, apricot and lavender category identities |
| `trendLine`, `trendFill` | A strong blue trend with a quiet blue area |
| `heatFill` | One ordered intensity scale, independent of category colors |
| `onDarkMuted`, `onDarkFaint` | Supporting text on inverted ink surfaces |

**Stable meaning.** Category color does not mean success, warning or rank. Keep
identity colors stable when data moves. Intensity uses a fixed, declared scale.
Status, selection and missing information need text or form as well as color.
Use dark ink on pale fills and the dedicated action text on cobalt.

**Local authority.** Reference semantic variables directly where paint is used.
Do not duplicate colors in JavaScript or alias a root variable to another role:
descendant overrides must recolor only their own interface scope.

## Typography

**A clear voice.** Manrope supplies headings, interface text, reading text and
values. Use actual weights from the embedded variable face. Commands and code
use system monospace. The independent `font.heading`, `font.ui` and `font.sans`
roles share a family by default but remain independently overridable.

**Readable hierarchy.** Body copy uses 15px, editable values 16px and action text
14px. Page headings use 32px and grouped headings 20px. Short labels stay in
sentence case. Large values use tabular numerals where comparison benefits from
stable digit widths. Keep supporting copy readable rather than reducing opacity.

Choose typography by purpose: `type.cardTitle` for grouped headings,
`type.control` for editable values, `type.action` for actions, `type.uiLabel`
for field and interface labels, and the corresponding prose and caption roles
for longer reading and context. Do not enlarge all text to emphasize one value.

## Layout and geometry

**Contextual rounding.** Surfaces have 24px corners; controls and tooltips use
12px corners. Checkboxes keep small corners so their silhouette stays distinct
from radio buttons. Avoid applying a single pill shape to every object.

**Measured spacing.** Start with 28px page gutters, 24px surface padding and
24px group gaps. Reflow columns as space narrows while retaining reading order.
Keep primary actions reachable and labels legible. Dense data can scroll inside
its own plot; the containing page should not need horizontal scrolling.

**Accurate marks.** Soft corners never change the quantity encoded by position,
length or angle. Measured zero remains distinct from missing information. Curves
must not overshoot the observations, and incomplete totals cannot imply shares.
Use direct labels and nearby keys where they help comparison.

**Restrained elevation.** Shadow roles contain geometry only and combine with
the element's scoped ink. Negative spread keeps diffuse shadows close to the
edge. Plain surfaces remain flat. Avoid hard offsets, decorative glow, glass
blur, stacked containers or shadow on individual quantitative marks.

## Content and interaction

**Native behavior.** Keep visible labels, clear keyboard focus, predictable form
submission and normal selection. Focus uses ink, separately from the quiet field
boundary. Targets remain stable on hover. Disabled actions do not respond to
press feedback. Explain invalid and unavailable states with useful text.

**Independent states.** Fields, selections, badges and values consume their own
semantic paints. Changing an accent should not silently recolor every surface.
Use the inverse text roles on dark surfaces and preserve readable contrast.

## Motion

**Brief and finite.** Data drawing settles in 450ms; most interaction feedback
uses 160ms, with a separate 120ms press and 240ms progress transition. Motion
explains a state change without bouncing, looping or delaying access to content.

**Reduced motion.** Display the complete state immediately and suppress press
travel when reduced motion is requested. Keep resting shadows and hierarchy.
Changing the preference must preserve data, focus and current form values.

## Anti-patterns

- Heavy black outlines, hard shadows and irregular hand-drawn edges.
- Low-contrast pastel lettering or color as the only state indicator.
- A categorical rainbow used as a sequential intensity scale.
- Rounded marks that manufacture positive area for zero or unavailable values.
- Overshooting curves, decorative loops and animated background surfaces.
- Competing primary colors, nested cards and oversized pill-shaped fields.
