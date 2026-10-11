# Chart contracts

These references record implementation constraints, data semantics and regression
gotchas. Read the relevant language before editing its charts or consumer tests.
They supplement [AGENTS.md](../../../AGENTS.md), not the downstream design guides.
Public props remain in each component's exported types and `meta.json`; fixtures
stay in `example.tsx`. Follow the [authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md)
for build, delivery and browser verification.

| Language       | Implementation reference             | Visual foundation                                                 |
| -------------- | ------------------------------------ | ----------------------------------------------------------------- |
| Mono Editorial | [Chart contracts](mono-editorial.md) | [DESIGN.md](../../../registry/languages/mono-editorial/DESIGN.md) |
| Signal Console | [Chart contracts](signal-console.md) | [DESIGN.md](../../../registry/languages/signal-console/DESIGN.md) |
| Neo-brutalism  | [Chart contracts](neo-brutalism.md)  | [DESIGN.md](../../../registry/languages/neo-brutalism/DESIGN.md)  |
| Sketchbook     | [Chart contracts](sketchbook.md)     | [DESIGN.md](../../../registry/languages/sketchbook/DESIGN.md)     |
| Soft Studio    | [Chart contracts](soft-studio.md)    | [DESIGN.md](../../../registry/languages/soft-studio/DESIGN.md)    |
| Nocturne       | [Chart contracts](nocturne.md)       | [DESIGN.md](../../../registry/languages/nocturne/DESIGN.md)       |

Update a contract alongside a change to its data rules or rendering constraints.
Keep new library quirks near the affected component, and cross-cutting invariants
in AGENTS.md. Reconstruction history belongs in the
[reconstruction explanation](../../explanation/catalogue-reconstruction.md).
