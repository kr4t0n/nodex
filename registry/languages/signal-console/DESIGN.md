# Signal Console

Dense operational interfaces on a dark ground. Monospace typography, a rigid
grid and meaningful color make current state easy to scan.

This language applies to complete interfaces: pages, navigation, forms, controls,
prose and data displays. `tokens.json` holds the canonical values; this document
explains the visual decisions and relationships those values support.

## Visual atmosphere

- **Density.** Packed. Tight gaps and compact padding keep related information
  visible together.
- **Structure.** A consistent grid and repeated alignment make many surfaces
  readable as one instrument.
- **Motion.** Immediate. Transitions are brief; continuing motion communicates
  an actual ongoing state.

The reference is an operations console. Prioritize current conditions, clear
labels and repeatable placement over expressive composition.

## Color and contrast

Cool near-black ground and cool off-white ink establish the structure. Hue
carries a defined meaning.

| Token | Value | Role |
| --- | --- | --- |
| `--nx-bg` | `#0B0E13` | page ground |
| `--nx-surface` | `#12161D` | panel and card ground |
| `--nx-ink` | `#D7DEE8` | primary text and marks |
| `--nx-muted` | `#8A94A3` | supporting text and labels |
| `--nx-faint` | `#5A6472` | quiet captions and minor details |
| `--nx-grid` | `#1E242E` | structural rules and separators |
| `--nx-accent` / `--nx-ok` | `#4DD4A8` | primary emphasis or healthy status |
| `--nx-withinObjective` | `#2FA37C` | a measured value within its stated objective |
| `--nx-warn` | `#E3B341` | warning or a stated limit requiring attention |
| `--nx-crit` | `#F0616D` | critical or failing status |

Separate neutral structure, magnitude and status. Within a surface, give colored
marks one clear meaning. Using the same green for both quantity and health makes
emphasis ambiguous. Categories use position or neutral tones when hue is already
reserved for state.

Color is never decorative. Pair status color with a readable label or a distinct
form. Surface depth comes from `--nx-surface` against `--nx-bg`, without shadows
or gradients.

Reference semantic variables directly so local overrides apply in their own
scope. Every additional color needs a language role; avoid literal palettes that
drift independently from the tokens.

## Typography

JetBrains Mono is the single typeface. Both `font.sans` and `font.mono` resolve
to the monospace stack, so ordinary controls and prose retain the same identity.
Numerals are tabular: columns align on digits and changing values retain stable
width.

| Role | Size | Treatment |
| --- | --- | --- |
| Page title | `18px` | weight 700, zero tracking |
| Card title | `12px` | weight 600, `0.02em` tracking |
| Body | `11.5px` | `1.7` line height |
| Control | `12px` | `1.4` line height |
| Action | `11.5px` | weight 600, `0.01em` tracking |
| Caption | `9px` | weight 500, uppercase, `0.1em` tracking |

The primary title and label scale uses zero or positive tracking and weights
from 400 to 700. Prose and prominent-value roles retain their own defined
tracking and weights, including the prose title's weight 800. Use the role's
values instead of applying a global tracking or weight override.

Keep current values prominent and supporting context quiet. Card and dialog
headings use `type.cardTitle`; controls, actions, prose and values use their
corresponding roles. A caption is not a substitute for readable form text.

## Layout and geometry

The baseline composition uses twelve columns, `10px` gaps and `20px` page
padding. Size surfaces in whole columns and align repeated rows. Reflow the grid
on smaller screens while preserving label order and readable controls.

Card padding is `14px 16px 12px`. Cards and ordinary controls use `3px` corners;
code, tooltip and focus treatments retain their dedicated radius roles. Avoid
using those exceptions to soften the whole interface.

Keep related information close and align labels with the values or controls they
name. Empty space separates groups or communicates an unavailable state; it
should not turn a compact surface into a spacious editorial composition.

Structural rules use the `1px` hairline role. Primary marks use `2px`, emphasis
uses `3px`, and ordinary lines do not exceed `4px`. Sub-pixel marks lose the
language's immediate legibility.

## Content and interaction

**Predictable anatomy.** Monitoring surfaces place the label and current value
or state first, the main content next, and source, window and freshness context
last when available. Forms and prose retain a consistent heading and content
order without inventing operational metadata.

**Honest status.** A stale reading, unavailable value and measured zero are
different states. Keep their wording and visual treatment distinct. Freshness
claims and pending indicators must correspond to actual application state.

**Rapid scanning.** Prioritize the current condition and the exceptions that
need attention. Summarize dense information when individual records can no
longer be distinguished, keeping the grouping and units explicit.

**Direct operation.** Controls use the same grid and semantic roles as the
surrounding content. Keep focus, labels, keyboard access and selected states
clear. Feedback should confirm an action without disrupting adjacent readings.

## Motion

Content enters quickly: the draw role uses `0.35s` with an ease-out curve.
Control feedback has its own `160ms` role, separate from larger transitions.
Avoid long entrance sequences or stagger that delays access to current state.

Continuing motion is reserved for actual live or pending state. A static reading
does not justify a pulse, sweep or decorative shimmer. Stop ongoing motion when
that state ends.

Respect reduced motion whenever the preference changes. Resolve transitions to
the complete state and stop loops while retaining a clear static indication of
status.

## Anti-patterns

- Decorative hue, competing accents or colors with conflicting meanings.
- Sub-pixel structural marks or faint styling that obscures primary readings.
- Global typography overrides that erase the defined roles.
- Arbitrary panel placement, inconsistent row alignment or oversized empty space.
- Rounded card corners beyond `3px`, drop shadows or gradients.
- Dense records that cannot be distinguished at the intended reading size.
- Hidden current state, fabricated freshness or missing data displayed as zero.
- Looping motion without an ongoing state or without reduced-motion handling.
- Duplicating token values instead of applying their semantic roles.
