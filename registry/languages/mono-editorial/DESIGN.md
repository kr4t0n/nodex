# Mono Editorial

Quiet editorial interfaces on warm paper. Thin rules, restrained typography and
ample space give content room to be read carefully.

This language applies to complete interfaces: pages, navigation, forms, controls,
prose and data displays. `tokens.json` holds the canonical values; this document
explains the visual decisions and relationships those values support.

## Visual atmosphere

- **Density.** Airy. Generous margins and clear grouping give each idea its own
  space.
- **Structure.** A predictable grid and shared reading edges establish order.
  Variation comes from the content and its hierarchy.
- **Motion.** Quiet. Content arrives, settles and remains available for reading.

The reference is a printed statistical annual: measured, precise and unhurried.
Preserve that character in ordinary pages and forms as well as in reports.

## Color and contrast

Warm off-white paper and near-black ink define the palette. Every intermediate
value is a warm grey. Emphasis comes from weight, size, position and density.

| Token | Value | Role |
| --- | --- | --- |
| `--nx-bg` / `--nx-paper` | `#F0EFEB` | page and surface ground |
| `--nx-ink` / `--nx-dark` | `#1C1C1A` | primary text, marks and inverted surfaces |
| `--nx-muted` | `#8F8E88` | supporting text and secondary emphasis |
| `--nx-faint` | `#C6C5BF` | quiet captions and minor details |
| `--nx-grid` | `#DEDDD6` | structural rules and separators |

Use the semantic role appropriate to the content. Additional tonal roles refine
this hierarchy; they do not introduce an accent palette. Selection, urgency and
validation remain monochrome and need clear wording or form to convey meaning.

An occasional surface may invert to ink with paper text. Its secondary text uses
`--nx-onDarkMuted` and `--nx-onDarkFaint`. Rebalance all foreground contrast when
inverting a surface so the strongest emphasis remains the most visible.

Reference semantic variables directly. Local token overrides must apply within
their containing scope. Avoid copying literal colors or creating a parallel
palette that can drift from the language.

## Typography

Inter is the single typeface, using the defined weights from 400 to 800. The
scale is restrained; weight, tracking and surrounding space establish hierarchy.

| Role | Size | Treatment |
| --- | --- | --- |
| Page title | `22px` | weight 800, `-0.02em` tracking |
| Card title | `16.5px` | weight 700, `-0.02em` tracking |
| Body | `11.5px` | `1.7` line height |
| Control | `12px` | `1.4` line height |
| Action | `11.5px` | weight 600, `0.01em` tracking |
| Caption | `9.5px` | weight 500, uppercase, `0.08em` tracking |

Use negative tracking for headings and positive tracking for uppercase labels.
Small captions should read as supporting credit lines, leaving primary content
visually dominant. Long-form prose and prominent values have their own roles;
use those roles instead of stretching the caption or heading scale to fit.

Choose tokens by purpose. Card and dialog headings share `type.cardTitle`;
form text uses `type.control`, actions use `type.action`, and supporting captions
use `type.caption`. Separate heading and value roles remain independently
adjustable even when their sizes are similar.

## Layout and geometry

The baseline composition uses two columns, `22px` gaps and `40px` page padding.
Collapse columns when needed to preserve readable content and usable controls.
Wider content can span the grid while retaining its shared starting edge.

Surface padding is `28px 28px 20px`, with `24px` card corners. Pill controls use
their own `radius.pill` role; smaller controls, code and focus treatments retain
their dedicated geometry. A surface's radius is not a universal radius for every
element inside it.

Align headings, prose and related groups on the left. When content reaches its
width limit, leave the remaining space after it. Use whitespace to separate
ideas before adding another border or container.

Rules are delicate. `stroke.hairline` is `0.7px`, ordinary marks use `1px`, and
emphasis uses `1.1px`. Strokes that read as lines stay at or below `1.4px`.
A width that encodes an amount, or a background gap separating filled regions,
has a different role from an outline.

## Content and interaction

**One clear hierarchy.** Give each section a meaningful heading, supporting
context where needed, and the content itself. Avoid repeating a heading inside
a surface that is already named by its surrounding section.

**Purposeful annotation.** Place explanations beside the content they clarify.
A note should explain a relationship, unit or exception without competing with
the heading. Keep labels concise and information density deliberate.

**Readable detail.** Close reading preserves individual records and their
relationships. In data displays, use a hairline where it carries the same
information as a large fill. Distinguish unavailable information from measured
zero and keep the meaning of tone and size consistent.

**Functional feedback.** Inputs, actions and selections use their semantic text,
spacing and state roles. Preserve visible focus, clear labels and keyboard
operation. Hover or press feedback should explain an available action or changed
state without becoming an ornament.

## Motion

Use the language's motion roles for the purpose they name. Content drawing has
an unhurried `1s` duration; control feedback uses the separate `160ms` control
role. A small interaction should not inherit the duration of a large reveal.

Entry and meaningful state changes may animate, then settle. Avoid continuous
loops and decorative hover motion. Respect reduced motion whenever the preference
changes, presenting the complete state without requiring an animation to finish.

## Anti-patterns

- Introducing hue, colored status accents or a second palette.
- Heavy outlines, drop shadows or gradients used as decoration.
- Enlarging surface corners beyond the `24px` card role or applying that role
  indiscriminately to controls.
- Crowding unrelated ideas into one group or filling space with extra containers.
- Oversized headings, dense captions or inconsistent reading edges.
- Aggregating away the individual records required for close reading.
- Repeated headings, unrelated controls or annotations that overwhelm content.
- Looping decoration, fabricated information or ambiguous missing states.
- Duplicating token values instead of applying their semantic roles.
