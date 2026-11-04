import { describe, expect, it } from "vitest";
import { validateOwnershipShares } from "../../src/services/ownership.service.js";

describe("validateOwnershipShares", () => {
  it("accepts an exact 100 percent joint ownership", () => {
    expect(validateOwnershipShares([{ sharePercent: "60.00" }, { sharePercent: "40.00" }])).toBe(true);
  });

  it("rejects totals below or above 100 percent", () => {
    expect(() => validateOwnershipShares([{ sharePercent: "90" }])).toThrow(/exactly 100/);
    expect(() => validateOwnershipShares([{ sharePercent: "60" }, { sharePercent: "50" }])).toThrow(/exactly 100/);
  });

  it("uses decimal arithmetic rather than floating point", () => {
    expect(validateOwnershipShares([{ sharePercent: "33.33" }, { sharePercent: "33.33" }, { sharePercent: "33.34" }])).toBe(true);
  });
});
