# Catalogue reconstruction

This is historical context for maintaining the reconstructed specimens. For the
current architecture, read [AGENTS.md](../../AGENTS.md); for implementation details,
read the [chart contracts](../reference/chart-contracts/README.md).

## Reference and scope

The React delivery and token contract was validated with nine expressive charts
and all 24 primitives. The complete 65-chart catalogue has now been reconstructed
through that contract under the owner's authorization.
The old expressive catalogue at `099f1ef` remains the specimen reference in Git
history. Rebuild each chart against the current contract; never restore legacy
runtime artifacts. New families still require their rendering and delivery checks.

Reconstruction is not a redesign. Preserve the previous branch's specimen data,
titles, copy, chart encoding, proportions and existing language values while
changing the rendering and delivery architecture. Do not add controls, tables,
annotations or demo variants, or make unrelated dependency upgrades. The data
dropdowns and other unsolicited specimen changes have been removed. New product
behavior requires its own user request.

## Current boundary

The original 65-chart catalogue follows the React source-delivery and token
contract. Later language additions follow the same contract; the manifest owns
the current catalogue, so 65 is a reconstruction milestone, not its current size.
The per-language references retain specimen-specific differences between legacy
comments and actual behavior. Preserve those measured encodings when maintaining
components; legacy comments alone do not authorize new behavior.

Commercial provenance for material revived from older samples still needs review.
Deleting old files does not establish a license.
