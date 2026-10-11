# Developer documentation

Start with the [root README](../README.md) for setup, commands, configuration and
contribution/release flow. [AGENTS.md](../AGENTS.md) is the architecture authority.

| Reader need                                   | Document                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Add or change registry content                | [Authoring procedure](../.agents/skills/nodex-authoring/SKILL.md)                      |
| Maintain chart data and rendering behavior    | [Chart contract references](reference/chart-contracts/README.md)                       |
| Understand gallery previews and landing state | [Gallery runtime](explanation/gallery-runtime.md)                                      |
| Understand the legacy specimen boundary       | [Catalogue reconstruction](explanation/catalogue-reconstruction.md)                    |
| Use delivered components in another app       | [CLI README](../packages/cli/README.md) and [consumer skill](../skills/nodex/SKILL.md) |
| Verify the formatting baseline                | [Formatting and lint evidence](verification/format-lint/README.md)                     |

Each `registry/languages/<language>/DESIGN.md` defines that language's visual
foundation; `tokens.json` is its canonical value source. Component-specific
contracts belong in the references above, leaving the design guides useful for
downstream interfaces with no charts.
