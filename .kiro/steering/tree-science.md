---
inclusion: fileMatch
fileMatchPattern: ["src/optimizer/**/*.ts", "tests/optimizer/**/*.ts"]
---

# Treecast — Tree Science

- Massachusetts is heating-dominated. Score a candidate spot by its direction
  from the nearest building wall:
  - West and southwest: highest. Deciduous shade tree; blocks summer afternoon
    sun.
  - North and northwest: small. One tree gives little; a windbreak needs many
    trees together. Score it low, and only as a winter wind effect.
  - East: small positive (morning shade). In the north it can be a slight winter
    penalty, because an east tree blocks early-morning sun. Rank it below west,
    above north.
  - South: deciduous only, small positive. An evergreen on the south side is a
    PENALTY because it blocks winter sun.
- Distance band: [10] to [60] ft from the wall. The effect fades with distance.
  (ASSUMPTION: the 10 ft minimum keeps roots off foundations.)
- Minimum spacing between chosen trees: [25] ft (ASSUMPTION). No tree inside a
  building footprint or within [5] ft of a road.
- Crown size grows with years since planting; use one simple, cited growth
  curve.
- Every coefficient lives in `src/optimizer/coefficients.ts` with a comment
  naming its source, or the word ASSUMPTION.
- Never invent kWh, dollar or CO2 figures. If no source supports a number, stop
  and ask me.
- Sources: i-Tree Design methods (USDA Forest Service); Hwang, Wiseman & Thomas
  2016, Cities and the Environment 9(1); 2022 Massachusetts Climate Change
  Assessment.
- The optimizer is pure TypeScript: no DOM, no network, deterministic, so it can
  be property-tested.
