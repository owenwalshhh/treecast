/**
 * Property test (greater-boston R5 / R7.4):
 *   For any building with no valid height, the extrusion height is 8 m and the
 *   building is flagged estimated. For any building WITH a valid positive
 *   height, that exact height is used and it is not flagged.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  resolveHeight,
  DEFAULT_BUILDING_HEIGHT_M,
} from "../../src/optimizer/building-height";

describe("resolveHeight (3D extrusion height rule)", () => {
  it("a missing/invalid height always yields 8 m, flagged estimated", () => {
    const missing = fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant(""),
      fc.constant("abc"),
      fc.constant(NaN),
      fc.constant(0),
      fc.double({ min: -1000, max: 0, noNaN: true }), // non-positive
    );
    fc.assert(
      fc.property(missing, (raw) => {
        const r = resolveHeight(raw);
        expect(r.renderHeight).toBe(DEFAULT_BUILDING_HEIGHT_M);
        expect(r.estimated).toBe(true);
      }),
    );
  });

  it("a valid positive height is used exactly and not flagged", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 500, noNaN: true }),
        (h) => {
          const r = resolveHeight(h);
          expect(r.renderHeight).toBe(h);
          expect(r.estimated).toBe(false);
        },
      ),
    );
  });
});
