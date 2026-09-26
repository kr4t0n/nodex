# Nocturne

A composed dark interface: graphite grounds, quiet layered surfaces, proportional
type and measured color. Information has room to breathe while related actions
remain close. This language applies to complete products, including navigation,
forms, prose and data displays. Tokens hold the canonical values.

## Visual atmosphere

**Content carries the light.** Put the strongest contrast on useful text, current
values and the primary action. Navigation and supporting structure recede without
becoming illegible. Iris gives actions a consistent identity; data has its own
category and intensity roles.

**Depth through surfaces.** Graphite page grounds support slightly lighter panels
and fields. Compact corners and fine boundaries establish construction. Surfaces
are opaque and flat, with clear groups separated by whitespace.

**Comfortable precision.** Align labels, numerical readings and control edges.
Keep a moderate reading density, open plot areas and generous space between tasks.
A screen should present a clear hierarchy before its details are inspected.

## Color and contrast

| Role | Meaning |
| --- | --- |
| `bg`, `paper` | Graphite page ground and plain surfaces |
| `surfaceFill` | Grouped surfaces and dialogs, distinguished by a lighter ground |
| `fieldFill` | Editable regions, native options and quiet measurement tracks |
| `ink` | Soft white primary text, focus indicators and important readings |
| `muted`, `faint` | Supporting and secondary copy on dark surfaces |
| `border` | Visible control boundaries, independent of plot guides |
| `grid` | Low-emphasis separators and measurement guides |
| `actionFill`, `actionText`, `actionBorder` | Iris primary actions with dark lettering |
| `actionHoverFill`, `actionHoverBorder` | Lighter iris feedback without changing geometry |
| `selectionFill`, `selectionText` | Selected controls with a contrasting dark mark |
| `badgeFill`, `badgeText` | Quiet violet ground with readable iris lettering |
| `valueFill`, `valueQuietFill` | Teal progress and blue supporting values |
| `seriesA`–`seriesD` | Iris, teal, amber and blue category identities |
| `heatFill` | Teal intensity against a fixed, explicitly declared scale |
| `onDarkMuted`, `onDarkFaint` | Dark supporting text on an inverted light surface |

**Meaning precedes hue.** Category colors identify series; their order does not
imply rank, health or urgency. Increasing lightness carries increasing intensity
on the dark ground. Keep the scale constant when comparing data. Describe states
in words or symbols as well as color, including unavailable and measured zero.

**Inverse roles describe a relationship.** An inverted region uses the light ink
ground with dark text. The historical `onDark*` token names supply its secondary
text, so those values are dark in this language. Do not reuse muted dark-surface
lettering on a light inverse region.

Reference semantic variables directly at the element that uses them. Each font
and paint role can be overridden within a descendant scope independently.

## Typography

**A proportional voice.** Inter supplies headings, navigation, body copy and
editable values. System monospace is reserved for commands and identifiers.
Use independent heading, UI and reading font roles even when they share a face.

Body copy is 14px with a relaxed line height; editable values are 16px. Controls
use compact 13px action text. Headings use restrained medium and semibold weights,
with slightly tightened tracking. Large numerical readings use tabular figures
and tighter spacing, while axes and supporting labels remain quiet and readable.

Use sentence case and short, descriptive labels. Prefer alignment, scale and
whitespace to all-caps headings or repeated bold text. Long copy wraps naturally;
keep full labels available when a compact data annotation is shortened.

## Layout and geometry

Panel corners are 12px, action and field corners are 6px, and small data marks
use a tighter 3px radius. Keep circular encodings exactly circular. Fine 1px
structural rules support 2px data strokes; emphasis preserves encoded quantities.

Use 24px panel padding and deliberate gaps between groups. Align reading edges
and reserve space for direct labels rather than placing them over plotted marks.
Prefer one surface per meaningful group. Keys reflow below their visualization
when horizontal space is limited. Dense content scrolls within its own region.

## Content and interaction

**Values remain accountable.** Source, period, units and context come from the
application. Show an explicit unavailable state for missing input. A missing
reading cannot become a zero, a complete allocation or an implied latest value.

**Controls stay familiar.** Preserve native labels, focus, keyboard behavior,
selection and modal dismissal. Focus has visible ink contrast. Hover strengthens
the relevant surface or boundary without shifting the surrounding layout.
Disabled controls retain their geometry and do not animate on interaction.

Use supporting explanations near the decision they inform. Tooltip content
supplements direct labels and remains available to keyboard inspection.

## Motion

Motion is finite and purposeful. Data settles through a short draw; controls use
their shorter interaction roles. Changes in series or values retain identity.
Reduced motion presents the final state immediately and preserves all information,
focus and resting visual hierarchy. Avoid ambient movement in working interfaces.

## Anti-patterns

- Glowing marks, bloom and decorative gradients that obscure precise boundaries.
- Transparent panels that make contrast depend on unrelated content behind them.
- Monospace body copy, excessive chrome and status color without an explicit state.
- Pale secondary text reused on an inverted light surface.
- Category palettes used as sequential scales or reordered with every new rank.
- Heavy outlines around every fragment, nested panels and oversized rounded pills.
- Interpolation that suggests observations the caller did not supply.
