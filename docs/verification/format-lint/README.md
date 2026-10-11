# Formatting and lint verification

Captured with the pinned Chromium at 1365 × 900 and 390 × 900, with embedded
fonts loaded and reduced motion enabled. Before uses dev at `5ce2752`; after
uses the formatted source and accessibility fixes in this change.

All 28 image pairs have identical decoded RGBA pixels. These captures cover all
six language gallery headers, six affected component detail pages, the terminal,
and the treemap with keyboard focus and an inspected observation. The automated
consumer and gallery suites additionally exercise all components, native controls,
scoped tokens and live motion changes; screenshots cover only the listed states.

The treemap now identifies its existing keyboard interaction as an application
with an accessible description. Parallel coordinates names its control group.
Link/card wrappers make their existing children explicit. These changes do not
alter visible specimen content. Chart data, tokens and metadata values are retained.

| Capture                                        | Before                                                           | After                                                          | Changed pixels |
| ---------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | -------------- |
| l / mono-editorial-1365                        | [Before](before/_l_mono-editorial-1365.png)                      | [After](after/_l_mono-editorial-1365.png)                      | 0              |
| l / mono-editorial-390                         | [Before](before/_l_mono-editorial-390.png)                       | [After](after/_l_mono-editorial-390.png)                       | 0              |
| l / mono-editorial / bar-race-1365             | [Before](before/_l_mono-editorial_bar-race-1365.png)             | [After](after/_l_mono-editorial_bar-race-1365.png)             | 0              |
| l / mono-editorial / bar-race-390              | [Before](before/_l_mono-editorial_bar-race-390.png)              | [After](after/_l_mono-editorial_bar-race-390.png)              | 0              |
| l / mono-editorial / card-1365                 | [Before](before/_l_mono-editorial_card-1365.png)                 | [After](after/_l_mono-editorial_card-1365.png)                 | 0              |
| l / mono-editorial / card-390                  | [Before](before/_l_mono-editorial_card-390.png)                  | [After](after/_l_mono-editorial_card-390.png)                  | 0              |
| l / mono-editorial / link-1365                 | [Before](before/_l_mono-editorial_link-1365.png)                 | [After](after/_l_mono-editorial_link-1365.png)                 | 0              |
| l / mono-editorial / link-390                  | [Before](before/_l_mono-editorial_link-390.png)                  | [After](after/_l_mono-editorial_link-390.png)                  | 0              |
| l / mono-editorial / nested-treemap-1365-focus | [Before](before/_l_mono-editorial_nested-treemap-1365-focus.png) | [After](after/_l_mono-editorial_nested-treemap-1365-focus.png) | 0              |
| l / mono-editorial / nested-treemap-1365       | [Before](before/_l_mono-editorial_nested-treemap-1365.png)       | [After](after/_l_mono-editorial_nested-treemap-1365.png)       | 0              |
| l / mono-editorial / nested-treemap-390-focus  | [Before](before/_l_mono-editorial_nested-treemap-390-focus.png)  | [After](after/_l_mono-editorial_nested-treemap-390-focus.png)  | 0              |
| l / mono-editorial / nested-treemap-390        | [Before](before/_l_mono-editorial_nested-treemap-390.png)        | [After](after/_l_mono-editorial_nested-treemap-390.png)        | 0              |
| l / mono-editorial / parallel-coords-1365      | [Before](before/_l_mono-editorial_parallel-coords-1365.png)      | [After](after/_l_mono-editorial_parallel-coords-1365.png)      | 0              |
| l / mono-editorial / parallel-coords-390       | [Before](before/_l_mono-editorial_parallel-coords-390.png)       | [After](after/_l_mono-editorial_parallel-coords-390.png)       | 0              |
| l / mono-editorial / scatter-morph-1365        | [Before](before/_l_mono-editorial_scatter-morph-1365.png)        | [After](after/_l_mono-editorial_scatter-morph-1365.png)        | 0              |
| l / mono-editorial / scatter-morph-390         | [Before](before/_l_mono-editorial_scatter-morph-390.png)         | [After](after/_l_mono-editorial_scatter-morph-390.png)         | 0              |
| l / neo-brutalism-1365                         | [Before](before/_l_neo-brutalism-1365.png)                       | [After](after/_l_neo-brutalism-1365.png)                       | 0              |
| l / neo-brutalism-390                          | [Before](before/_l_neo-brutalism-390.png)                        | [After](after/_l_neo-brutalism-390.png)                        | 0              |
| l / nocturne-1365                              | [Before](before/_l_nocturne-1365.png)                            | [After](after/_l_nocturne-1365.png)                            | 0              |
| l / nocturne-390                               | [Before](before/_l_nocturne-390.png)                             | [After](after/_l_nocturne-390.png)                             | 0              |
| l / signal-console-1365                        | [Before](before/_l_signal-console-1365.png)                      | [After](after/_l_signal-console-1365.png)                      | 0              |
| l / signal-console-390                         | [Before](before/_l_signal-console-390.png)                       | [After](after/_l_signal-console-390.png)                       | 0              |
| l / sketchbook-1365                            | [Before](before/_l_sketchbook-1365.png)                          | [After](after/_l_sketchbook-1365.png)                          | 0              |
| l / sketchbook-390                             | [Before](before/_l_sketchbook-390.png)                           | [After](after/_l_sketchbook-390.png)                           | 0              |
| l / soft-studio-1365                           | [Before](before/_l_soft-studio-1365.png)                         | [After](after/_l_soft-studio-1365.png)                         | 0              |
| l / soft-studio-390                            | [Before](before/_l_soft-studio-390.png)                          | [After](after/_l_soft-studio-390.png)                          | 0              |
| terminal-1365                                  | [Before](before/terminal-1365.png)                               | [After](after/terminal-1365.png)                               | 0              |
| terminal-390                                   | [Before](before/terminal-390.png)                                | [After](after/terminal-390.png)                                | 0              |
