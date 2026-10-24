/**
 * Property test (greater-boston R4 / R7.1):
 *   For any candidate point, equityForPoint returns the attributes of the block
 *   group that CONTAINS it — and a point in no block group returns null.
 *
 * Built on synthetic non-overlapping square block groups so the containment is
 * known exactly, independent of real geometry.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { equityForPoint } from "../../src/optimizer/block-group";

/** A unit square block group at integer grid cell (gx, gy), 1°×1°. */
function squareBG(gx: number, gy: number) {
  const x = gx, y = gy;
  return {
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
          [x, y],
        ],
      ],
    },
    properties: {
      geoid: `bg-${gx}-${gy}`,
      tract: `t-${gx}-${gy}`,
      municipality: "Test",
      minorityPct: gx * 10,
      limitedEnglishPct: gy * 5,
      income: 50000 + gx * 1000,
      ej: "Yes",
      ejCriteria: "Minority",
    },
  };
}

// A 5×5 grid of adjacent squares covering [0,5]×[0,5].
const grid: ReturnType<typeof squareBG>[] = [];
for (let gx = 0; gx < 5; gx++)
  for (let gy = 0; gy < 5; gy++) grid.push(squareBG(gx, gy));

describe("equityForPoint (point-in-block-group join)", () => {
  it("returns the containing block group's attributes", () => {
    fc.assert(
      fc.property(
        // A point strictly inside some cell (avoid exact edges).
        fc.double({ min: 0.05, max: 4.95, noNaN: true }),
        fc.double({ min: 0.05, max: 4.95, noNaN: true }),
        (lng, lat) => {
          const expectGx = Math.floor(lng);
          const expectGy = Math.floor(lat);
          const r = equityForPoint(lng, lat, grid);
          expect(r).not.toBeNull();
          expect(r!.geoid).toBe(`bg-${expectGx}-${expectGy}`);
          // Attributes match that exact cell, not a neighbor's.
          expect(r!.minorityPct).toBe(expectGx * 10);
          expect(r!.income).toBe(50000 + expectGx * 1000);
        },
      ),
    );
  });

  it("returns null for a point outside every block group", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 6, max: 100, noNaN: true }),
        fc.double({ min: 6, max: 100, noNaN: true }),
        (lng, lat) => {
          expect(equityForPoint(lng, lat, grid)).toBeNull();
        },
      ),
    );
  });
});
