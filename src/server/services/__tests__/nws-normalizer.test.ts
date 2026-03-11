import { describe, expect, it } from "vitest";

import { computeStale, mapNwsSeverity } from "@/server/services/nws";

describe("mapNwsSeverity", () => {
  it("maps severe to high", () => {
    expect(mapNwsSeverity("Severe")).toBe("high");
  });

  it("maps extreme to extreme", () => {
    expect(mapNwsSeverity("Extreme")).toBe("extreme");
  });

  it("defaults unknown severities to low", () => {
    expect(mapNwsSeverity("Minor")).toBe("low");
  });
});

describe("computeStale", () => {
  it("returns true for null last success", () => {
    expect(computeStale(null, 10)).toBe(true);
  });

  it("returns false for recent timestamp", () => {
    const timestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(computeStale(timestamp, 10)).toBe(false);
  });

  it("returns true for old timestamp", () => {
    const timestamp = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(computeStale(timestamp, 10)).toBe(true);
  });
});
