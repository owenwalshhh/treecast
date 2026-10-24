# Treecast — Product

## What it is
A web app that recommends exactly where to plant trees in one Massachusetts
neighborhood so they cool the residents most at risk from extreme heat, cut
building energy use, and never raise anyone's heating bill.

## Why
The 2022 Massachusetts Climate Change Assessment ranks the health effects of
extreme heat as the most urgent impact on people, and names tree canopy as a
favored solution. A tree's energy effect depends on where it stands relative to
a building: west-side shade cuts cooling, but in a heating-dominated climate
like ours, a tree on the south side can raise heating use.

## Event
Hackachusetts 2026, Climate Tech track.
- C1 — Resilient communities
- C2 — Cleaner, more affordable buildings

## Users
1. City forester or utility tree-program manager (desktop): sets a tree budget
   and an energy-vs-equity slider, runs the optimizer, compares it with a naive
   plan, exports a planting list.
2. Resident (phone): enters an address and sees where a tree would help their
   home most, in English or Spanish.

## Demo area
[NEIGHBORHOOD, TOWN], an environmental justice area from the MassGIS EJ block
groups.

## Features, in priority order
1. Planner map with a tree budget, an energy-vs-equity slider, and an animated
   Optimize.
2. Naive plan vs. optimized plan comparison, same tree count.
3. "Why here?" popup for each tree.
4. Growth slider, year 0 to 30.
5. Resident phone view, English and Spanish.
6. Sources and limits panel.

## Principles
- Every number traces to a public, cited source.
- Never recommend a tree that raises a home's heating bill.
- Equity first: weight the most heat-exposed, lowest-income residents.
