import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { naivePlan, optimize } from "../../src/optimizer/optimize";
import { MIN_TREE_SPACING_FT } from "../../src/optimizer/coefficients";
import type { CandidateSite } from "../../src/optimizer/types";
import type { Direction, LeafType } from "../../src/optimizer/coefficients";

/** Build a candidate site with sensible defaults. */
function site(partial: Partial<CandidateSite> & { id: string }): CandidateSite {
  return {
    at: { x: 0, y: 0 },
    direction: "W",
    distanceToWallFt: 15,
    leafType: "deciduous",
    equityNeed: 0.5,
    ...partial,
  };
}

/** A spread-out set where spacing never blocks a pick. */
function spreadCandidates(): CandidateSite[] {
  return [
    site({ id: "a", direction: "W", at: { x: 0, y: 0 } }),
    site({ id: "b", direction: "N", at: { x: 1000, y: 0 } }),
    site({ id: "c", direction: "S", at: { x: 2000, y: 0 }, leafType: "evergreen" }),
    site({ id: "d", direction: "E", at: { x: 3000, y: 0 } }),
    site({ id: "e", direction: "SW", at: { x: 4000, y: 0 } }),
  ];
}

describe("optimize: budget", () => {
  it("never returns more trees than the budget", () => {
    const plan = optimize(spreadCandidates(), { budget: 2, equityWeight: 0 });
    expect(plan.trees.length).toBe(2);
  });

  it("returns no trees for a zero budget", () => {
    const plan = optimize(spreadCandidates(), { budget: 0, equityWeight: 0 });
    expect(plan.trees.length).toBe(0);
  });

  it("caps at the number of candidates when the budget is larger", () => {
    const cands = spreadCandidates();
    const plan = optimize(cands, { budget: 99, equityWeight: 0 });
    expect(plan.trees.length).toBe(cands.length);
  });
});

describe("optimize: picks the best set", () => {
  it("picks the west spot before the north spot at pure energy", () => {
    const plan = optimize(spreadCandidates(), { budget: 1, equityWeight: 0 });
    expect(plan.trees[0].site.id).toBe("a"); // west
  });

  it("never picks the south evergreen (negative energy) when better spots exist", () => {
    const plan = optimize(spreadCandidates(), { budget: 4, equityWeight: 0 });
    const ids = plan.trees.map((t) => t.site.id);
    expect(ids).not.toContain("c"); // south evergreen, negative score
  });

  it("orders chosen trees by descending score", () => {
    const plan = optimize(spreadCandidates(), { budget: 5, equityWeight: 0 });
    for (let i = 1; i < plan.trees.length; i++) {
      expect(plan.trees[i - 1].score).toBeGreaterThanOrEqual(
        plan.trees[i].score,
      );
    }
  });
});

describe("optimize: spacing", () => {
  it("never places two trees closer than the minimum spacing", () => {
    // Three west spots, two of them too close together.
    const cands = [
      site({ id: "near1", at: { x: 0, y: 0 } }),
      site({ id: "near2", at: { x: 5, y: 0 } }), // 5 ft from near1 — too close
      site({ id: "far", at: { x: 500, y: 0 } }),
    ];
    const plan = optimize(cands, { budget: 3, equityWeight: 0 });
    // Only one of the near pair can be chosen, plus the far one.
    expect(plan.trees.length).toBe(2);
    const min2 = MIN_TREE_SPACING_FT * MIN_TREE_SPACING_FT;
    for (let i = 0; i < plan.trees.length; i++) {
      for (let j = i + 1; j < plan.trees.length; j++) {
        const a = plan.trees[i].site.at;
        const b = plan.trees[j].site.at;
        const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        expect(d2).toBeGreaterThanOrEqual(min2);
      }
    }
  });
});

describe("optimize: determinism", () => {
  it("returns the same plan for the same input (ties broken by id)", () => {
    const cands = spreadCandidates();
    const a = optimize(cands, { budget: 3, equityWeight: 0.5 });
    const b = optimize(cands, { budget: 3, equityWeight: 0.5 });
    expect(a.trees.map((t) => t.site.id)).toEqual(
      b.trees.map((t) => t.site.id),
    );
  });

  it("breaks score ties by id, deterministically", () => {
    // Two identical-score west spots; "aaa" must come before "bbb".
    const cands = [
      site({ id: "bbb", at: { x: 0, y: 0 } }),
      site({ id: "aaa", at: { x: 1000, y: 0 } }),
    ];
    const plan = optimize(cands, { budget: 1, equityWeight: 0 });
    expect(plan.trees[0].site.id).toBe("aaa");
  });
});

describe("optimize vs naivePlan", () => {
  it("produces a total energy score at least as good as naive at pure energy", () => {
    const cands = spreadCandidates();
    const opts = { budget: 3, equityWeight: 0 };
    const optimized = optimize(cands, opts);
    const naive = naivePlan(cands, opts);
    expect(optimized.totalScore).toBeGreaterThanOrEqual(naive.totalScore);
  });

  it("gives optimized >= naive total score for random inputs (property)", () => {
    const dirs: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const leaves: LeafType[] = ["deciduous", "evergreen"];
    const siteArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 6 }),
      x: fc.double({ min: 0, max: 1e5, noNaN: true }),
      y: fc.double({ min: 0, max: 1e5, noNaN: true }),
      dir: fc.constantFrom(...dirs),
      leaf: fc.constantFrom(...leaves),
      equity: fc.double({ min: 0, max: 1, noNaN: true }),
      dist: fc.double({ min: 0, max: 80, noNaN: true }),
    });
    fc.assert(
      fc.property(
        fc.array(siteArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: 30 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (raw, budget, equityWeight) => {
          // Unique ids, well-separated so spacing never blocks a pick.
          const cands: CandidateSite[] = raw.map((r, i) => ({
            id: `${r.id}-${i}`,
            at: { x: i * 1000, y: 0 },
            direction: r.dir,
            distanceToWallFt: r.dist,
            leafType: r.leaf,
            equityNeed: r.equity,
          }));
          const opts = { budget, equityWeight };
          const optimized = optimize(cands, opts);
          const naive = naivePlan(cands, opts);
          // Greedy-by-score is optimal for a knapsack-free top-k pick when
          // spacing never binds, so optimized total >= naive total.
          expect(optimized.totalScore).toBeGreaterThanOrEqual(
            naive.totalScore - 1e-9,
          );
        },
      ),
    );
  });
});
