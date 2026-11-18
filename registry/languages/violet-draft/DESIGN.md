# Violet Draft

White technical sheets, violet actions and wide, weighty headings. Quiet lavender
rules organize information into adjoining regions. Monospace labels and quantities
give interfaces a precise reading rhythm; ordinary prose retains a proportional
face. This foundation applies to whole interfaces, including forms, navigation
and long-form content. `tokens.json` owns every value.

## Visual atmosphere

Use a clear title, aligned content edges and restrained emphasis. Let related
sections share a boundary instead of placing floating cards inside cards. The
page is white; pale violet-gray regions distinguish supporting material. Dark
inverse regions provide occasional contrast within this light-only language.
They are not a second appearance mode.

## Color and contrast

| Roles                                                                              | Purpose                                                           |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `bg`, `paper`, `surfaceFill`, `fieldFill`                                          | Independent white page, plot, panel and editable grounds          |
| `ink`, `muted`, `faint`                                                            | Main text, supporting prose and compact secondary labels          |
| `border`, `grid`, `plotGrid`, `ruleSoft`                                           | Quiet structural rules and supplementary guides                   |
| `fieldBorder`                                                                      | Visible editable boundary; stronger than decorative rules         |
| `surfaceAlt`, `plotTrack`                                                          | Pale supporting regions and unfilled value tracks                 |
| `actionFill`, `actionText`, `actionBorder`, `actionHoverFill`, `actionHoverBorder` | Violet primary action with white lettering and deeper hover paint |
| `selectionFill`, `selectionText`, `badgeFill`, `badgeText`                         | Independent selection and badge pairs                             |
| `valueFill`, `valueQuietFill`                                                      | Prominent violet and supporting gray-violet values                |
| `dark`, `onDarkMuted`, `onDarkFaint`                                               | Inverse ground and its supporting text                            |
| `darkText`, `darkTextSecondary`, `onDarkAccent`                                    | Lighter copy and lavender accents on inverse regions              |
| `successInk`, `warnInk`                                                            | Readable semantic text on light surfaces                          |
| `success`, `warn`                                                                  | Bright status marks, accompanied by text or shape                 |
| `seriesA`–`seriesD`, `heatLow`–`heatHigh`                                          | Category identity and ordered magnitude                           |

Keep normal text at least 4.5:1 against its actual ground. `ink`, `muted` and
`faint` meet that requirement on white and the pale supporting ground. White
action lettering remains readable on both violet action paints. Use the darker
semantic ink roles for status words; bright status colors are not body text.

Quiet structural rules are deliberately subtle. Do not use them as the sole
indicator of an editable field, focus, selection or meaningful data boundary.
Use `fieldBorder` for editable boundaries and `ink` for focus. Ordered pale fills
need labels, position and inspectable values; color alone must not explain data.
Unavailable readings are distinct from measured zero.

Consume each semantic role directly at the rendered element. Equal source colors
do not make action, selection and data roles interchangeable.

## Typography

Archivo supplies headings, prose and editable values. Its variable width is part
of the identity: page titles use 114% stretch and grouped headings use 110%.
Page titles range from 34px to 54px, at weight 800 with tight tracking. Grouped
headings use 18px at weight 800. Keep natural word shapes in prose headings.

IBM Plex Mono supplies interface labels, captions, tables, quantities and actions.
Compact labels use 11px, weight 600 and 1.5px tracking; actions use 13px and weight 700. Use uppercase for short category labels, not paragraphs. Prominent quantities
use 38px with tight tracking; ordinary values and axes remain readable at 12px.

Body text uses 15px with 1.65 leading. Supporting subtitles use 12.5px with 1.55
leading. Editable fields use 16px. Let headings and long labels wrap; do not
compress their font size to rescue a narrow layout. The heading, reading, UI and
code stacks remain independent semantic roles.

## Layout and geometry

Align content to shared edges. Use 40px page gutters on wide screens and 20px on
phones. Panels use 26px top, 24px side and 22px bottom padding; adjacent panels
can share a rule with no gap. Stack related columns in reading order when narrow.
Contain dense data's horizontal overflow inside its own region.

Surfaces, fields, badges and rectangular marks have square corners. Reserve the
diagonal lower-right cut for solid actions: 12px normally and 10px for compact
dialog actions. The cut belongs to the paint. Preserve the native hit box and
complete keyboard-focus outline. Native circular control marks retain their
functional shape. Use flat surfaces, 1px rules and 2px emphasis strokes. Do not
add elevated cards, decorative shadows, hand-drawn texture or rounded pills.

## Content and interaction

Keep labels close to values and errors close to their fields. Use a visible
field label and supporting text where it explains a real constraint. Preserve
native button, form, select and dialog behavior. Keyboard focus uses a clear
outline outside the control and stays visible at clipped corners. Disabled
actions do not move or react to hover.

Violet denotes emphasis, not success. Category colors remain stable within a
comparison. State words, direct values, position and shape carry information
alongside color. Empty data must say it is empty; it must not become a sample
series. Repeated instances and local token overrides remain independent.

## Motion

Primary actions use a 320ms diagonal wipe with the action easing. Ordinary
controls use 150ms feedback and disclosure uses 200ms. Keep geometry stable
during interaction. Data appears immediately: the default chart draw, pop and
fade durations are zero. Reduced motion removes transitions while retaining
the final state, focus and all keyboard behavior.

## Anti-patterns

- A global dark treatment inferred from occasional inverse sections.
- Rounded surfaces, floating shadows or decorative violet gradients.
- Clipping the interactive element itself to create the action corner.
- Pale rules used as essential field or focus boundaries.
- Monospace body paragraphs, tiny editable values or all-caps prose headings.
- Interpolated missing data, smoothed measurements or color-only state labels.
- New literal paints or duplicate JavaScript themes outside the token authority.
