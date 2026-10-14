# Hearth

Warm editorial interfaces for everyday rituals. Cream paper, soft umber and a
refined serif give recipes, journals, guides and useful data a calm reading pace.
The atmosphere is considered and welcoming: aligned edges, generous leading and
small touches of clay, olive, ochre and rosewood. This foundation applies to
complete interfaces, including forms, navigation, prose and data displays.
`tokens.json` owns the values in both modes.

## Visual atmosphere

**Read first.** Give the title, introduction and main content a clear sequence.
Keep supporting facts near the passage or action they explain. A recipe's
ingredients and numbered steps are distinct reading groups; they do not each
need a surrounding card. Use a shared edge and whitespace before adding chrome.

**A warm ground.** Light mode resembles cream paper with slightly deeper linen
panels. Dark mode uses umber, with a gently lighter panel and a deeper field.
Neither ground is stark. The strongest contrast belongs to readable text,
focus and meaningful marks.

**Restrained construction.** Fine rules, modest corners and flat surfaces give
the typography room. Avoid decorative paper grain, rough edges, ornamental
frames and repeated containers. Warmth comes from color, type and proportion.

## Color and contrast

| Roles                                                                              | Meaning                                                                     |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `bg`, `paper`                                                                      | Cream page and plot ground in light mode; umber in dark mode                |
| `surfaceFill`, `fieldFill`                                                         | Grouped content and editable regions, independently tunable                 |
| `ink`, `muted`, `faint`                                                            | Main, supporting and minor text, including numbered-list markers            |
| `border`                                                                           | Visible control and structural boundaries                                   |
| `grid`                                                                             | Supplementary guides and quiet tracks; never the sole essential boundary    |
| `actionFill`, `actionText`, `actionBorder`, `actionHoverFill`, `actionHoverBorder` | Clay actions with readable lettering and geometry-preserving hover feedback |
| `selectionFill`, `selectionText`                                                   | Olive selection and contrasting ticks, mixed marks and thumbs               |
| `badgeFill`, `badgeText`                                                           | Quiet warm badges with independent readable lettering                       |
| `valueFill`, `valueQuietFill`                                                      | Ochre and olive value marks                                                 |
| `seriesA`–`seriesD`                                                                | Stable clay, olive, ochre and rosewood category identities                  |
| `dark`, `onDarkMuted`, `onDarkFaint`                                               | Inverse surface and its supporting text relationships                       |

Light mode uses darker accents against cream. Dark mode raises their lightness
while retaining their hue identities. Supporting text changes with its surface;
do not lighten text by lowering opacity. The inverse surface uses `ink` as its
ground and `bg` as main text. In dark mode this is a light surface, so the
historically named `onDark*` roles contain dark supporting colors.

Keep normal text at least 4.5:1 against its actual background. The canonical
`ink`, `muted` and `faint` meet this on page, panel and field in both modes.
Action, selection and badge text have their own contrasting counterparts.
Boundaries and essential data marks target at least 3:1 against their ground.
Use `ink` or `muted` for chart labels: the category and value colors are mark
paints, not a replacement text palette.

Category colors convey identity, not rank, health or urgency. Provide direct
labels, position or distinct forms as well as color. Adjacent colored regions
need a visible separation when their boundary carries meaning. A quiet guide
may help orientation, but the data must remain understandable without it.

Apply semantic variables directly where paint is rendered. Equal values do not
make roles interchangeable. Descendant overrides should recolor only their own
scope; do not introduce JavaScript palettes or root aliases to another role.

## Typography

Newsreader supplies headings and short editorial emphasis. Source Sans 3 supplies
reading text, controls, labels and values. Normal and italic faces support true
emphasis without synthetic slanting. Code alone uses system monospace. The
heading, reading and UI stacks remain independent token roles.
Newsreader deliberately retains both its weight and optical-size axes in the
embedded normal and italic faces.

Page titles range from 32px in narrow compositions to 40px, with weight 500 and
slightly tightened tracking. Section headings use 28px, grouped headings 24px,
and smaller headings 22px and 20px. Sentence case and compact 1.2 leading keep
the serif hierarchy composed. Short labels remain readable at 13px.

Long prose uses 18px with 1.7 leading, ordinary body and ingredient rows use 16px
with 1.6 leading, and supporting notes use 15px. Controls use 16px text; actions
use 15px at weight 600. Keep prominent quantities in tabular numerals when
comparison benefits from a stable reading edge.

Use the role's purpose: `type.cardTitle` for card and dialog headings,
`type.control` for editable values and `type.action` for actions. Long-form
headings use the prose roles, including sentence-case `sectionTransform` and
compact `headingLineHeight`. Do not shrink all reading text to fit more content.

## Layout and geometry

Keep prose within 68ch, with 46ch notes or side columns. Use 24px page gutters
and allow more outer whitespace on larger screens. Retain the reading size as
space narrows, and stack related columns in their reading order. Ingredients
precede steps; a note stays near the instruction it qualifies.

Use a 4px rhythm, 24px group gaps and panel padding, and roughly 32–40px between
major reading sections. Give list items enough separation for scanning while
keeping each label beside its quantity or control. Primary targets should be
comfortably sized, around 44px high.

Panels use 12px corners, controls and tooltips 6px, and checkboxes and small marks
3px. Circular encodings stay circular. Structural rules are 1px; data lines are
2px. Corners never extend a quantitative mark beyond its true length. Zero has
no positive area, and unavailable readings never become synthetic measurements.

Surfaces remain flat. All shadow roles have zero geometry; panel tone, spacing
and fine boundaries establish grouping. Dense data may scroll within its own
region, but the containing page should reflow without horizontal scrolling.

## Content and interaction

Use concise, descriptive labels and explain unavailable or invalid states in
words. Preserve native form, selection, keyboard and modal behavior. Keyboard
focus uses the high-contrast ink role with a visible offset. Keep focus rings
clear of clipping boundaries and keep targets still on hover and press.

Use dark and light as two expressions of the same hierarchy. Changing mode
preserves the current reading position, form values, focus and chart state.
Avoid assigning different meanings to a hue in each mode. Text and marks on
inverted surfaces always use the inverse relationships.

## Motion

Motion is brief and finite: 160ms control feedback, 140ms toggles and marks,
180ms surfaces and disclosures, 240ms progress, and 350ms chart drawing. Use
ease-out timing and zero press travel. Information should be available without
waiting for a reveal.

Reduced motion presents the complete state immediately. A live preference
change retains values, focus and resting geometry. Avoid looping decoration,
bounce, ambient motion and animated backgrounds in reading interfaces.

## Anti-patterns

- Stark white or black grounds, cool neon accents and pastel text with weak contrast.
- Display serif applied to editable values or long, dense interface labels.
- All-caps prose headings, tight reading leading and oversized pill controls.
- Card grids for every paragraph, nested frames, drop shadows and paper textures.
- Using category color alone for a state or treating categories as an intensity ramp.
- Clipping content to fit a specimen or rounding zero into a visible bar.
- Fabricated missing values, connecting across absent observations and motion that delays reading.
