import { describe, expect, it } from "vitest";

import { computeFlightCategory } from "@/server/services/nws";

describe("computeFlightCategory", () => {
  it("returns VFR when ceiling >= 3000 ft and visibility >= 5 mi", () => {
    expect(computeFlightCategory(5000, 10)).toBe("VFR");
    expect(computeFlightCategory(3000, 5)).toBe("VFR");
  });

  it("returns MVFR when ceiling 1000-2999 ft", () => {
    expect(computeFlightCategory(2500, 10)).toBe("MVFR");
    expect(computeFlightCategory(1000, 10)).toBe("MVFR");
  });

  it("returns MVFR when visibility 3-4.9 mi", () => {
    expect(computeFlightCategory(5000, 4)).toBe("MVFR");
    expect(computeFlightCategory(5000, 3)).toBe("MVFR");
  });

  it("returns IFR when ceiling 500-999 ft", () => {
    expect(computeFlightCategory(500, 10)).toBe("IFR");
    expect(computeFlightCategory(999, 10)).toBe("IFR");
  });

  it("returns IFR when visibility 1-2.9 mi", () => {
    expect(computeFlightCategory(5000, 1)).toBe("IFR");
    expect(computeFlightCategory(5000, 2.5)).toBe("IFR");
  });

  it("returns LIFR when ceiling < 500 ft", () => {
    expect(computeFlightCategory(200, 10)).toBe("LIFR");
    expect(computeFlightCategory(0, 10)).toBe("LIFR");
    expect(computeFlightCategory(499, 10)).toBe("LIFR");
  });

  it("returns LIFR when visibility < 1 mi", () => {
    expect(computeFlightCategory(5000, 0.5)).toBe("LIFR");
    expect(computeFlightCategory(5000, 0)).toBe("LIFR");
  });

  it("uses the worse of ceiling or visibility", () => {
    // Good ceiling, bad visibility → LIFR
    expect(computeFlightCategory(5000, 0.5)).toBe("LIFR");
    // Bad ceiling, good visibility → IFR
    expect(computeFlightCategory(800, 10)).toBe("IFR");
  });

  it("returns UNKNOWN when both are null", () => {
    expect(computeFlightCategory(null, null)).toBe("UNKNOWN");
  });

  it("treats null ceiling as unlimited (only visibility matters)", () => {
    expect(computeFlightCategory(null, 10)).toBe("VFR");
    expect(computeFlightCategory(null, 0.5)).toBe("LIFR");
  });

  it("treats null visibility as unlimited (only ceiling matters)", () => {
    expect(computeFlightCategory(300, null)).toBe("LIFR");
    expect(computeFlightCategory(5000, null)).toBe("VFR");
  });

  it("handles exact boundary values correctly", () => {
    // Boundary: 500 ft ceiling → IFR (not LIFR)
    expect(computeFlightCategory(500, 10)).toBe("IFR");
    // Boundary: 1000 ft ceiling → MVFR (not IFR)
    expect(computeFlightCategory(1000, 10)).toBe("MVFR");
    // Boundary: 3000 ft ceiling → VFR (not MVFR)
    expect(computeFlightCategory(3000, 10)).toBe("VFR");
    // Boundary: 1 mi vis → IFR (not LIFR)
    expect(computeFlightCategory(5000, 1)).toBe("IFR");
    // Boundary: 3 mi vis → MVFR (not IFR)
    expect(computeFlightCategory(5000, 3)).toBe("MVFR");
    // Boundary: 5 mi vis → VFR (not MVFR)
    expect(computeFlightCategory(5000, 5)).toBe("VFR");
  });
});
