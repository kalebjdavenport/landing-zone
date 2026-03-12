import { describe, expect, it } from "vitest";

import { getThreatLevel, buildSummary } from "@/components/dashboard/national-report-utils";
import type { NationalReport } from "@/server/types";

function makeReport(overrides: Partial<NationalReport> = {}): NationalReport {
  return {
    generatedAt: new Date().toISOString(),
    stale: false,
    lastSuccessAt: new Date().toISOString(),
    activeAlerts: 0,
    severeAlerts: 0,
    topEvents: [],
    ...overrides,
  };
}

describe("getThreatLevel", () => {
  it("returns Low for 0 severe alerts", () => {
    expect(getThreatLevel(0).label).toBe("Low");
  });

  it("returns Low for 9 severe alerts", () => {
    expect(getThreatLevel(9).label).toBe("Low");
  });

  it("returns Moderate for 10 severe alerts", () => {
    expect(getThreatLevel(10).label).toBe("Moderate");
  });

  it("returns Moderate for 49 severe alerts", () => {
    expect(getThreatLevel(49).label).toBe("Moderate");
  });

  it("returns High for 50 severe alerts", () => {
    expect(getThreatLevel(50).label).toBe("High");
  });

  it("returns High for 149 severe alerts", () => {
    expect(getThreatLevel(149).label).toBe("High");
  });

  it("returns Extreme for 150 severe alerts", () => {
    expect(getThreatLevel(150).label).toBe("Extreme");
  });

  it("returns Extreme for 999 severe alerts", () => {
    expect(getThreatLevel(999).label).toBe("Extreme");
  });

  it("includes appropriate color classes for each level", () => {
    expect(getThreatLevel(0).color).toContain("emerald");
    expect(getThreatLevel(10).color).toContain("amber");
    expect(getThreatLevel(50).color).toContain("orange");
    expect(getThreatLevel(150).color).toContain("rose");
  });
});

describe("buildSummary", () => {
  it("returns no-alerts message when activeAlerts is 0", () => {
    const report = makeReport({ activeAlerts: 0, topEvents: [] });
    expect(buildSummary(report)).toBe("No active weather alerts nationwide.");
  });

  it("returns pending message when alerts exist but topEvents is empty", () => {
    const report = makeReport({ activeAlerts: 5, topEvents: [] });
    expect(buildSummary(report)).toContain("details pending");
  });

  it("returns risk guidance for known patterns", () => {
    const report = makeReport({
      activeAlerts: 10,
      topEvents: [
        { event: "Winter Storm Warning", count: 5 },
        { event: "Dense Fog Advisory", count: 3 },
      ],
    });
    const summary = buildSummary(report);
    expect(summary).toContain("Key risks:");
    expect(summary).toContain("icing and low visibility");
  });

  it("returns risk guidance matching Severe Thunderstorm", () => {
    const report = makeReport({
      activeAlerts: 10,
      topEvents: [
        { event: "Severe Thunderstorm Watch", count: 8 },
      ],
    });
    const summary = buildSummary(report);
    expect(summary).toContain("convection");
  });

  it("falls back to naming events when no patterns match", () => {
    const report = makeReport({
      activeAlerts: 3,
      topEvents: [
        { event: "Special Weather Statement", count: 2 },
        { event: "Rip Current Statement", count: 1 },
      ],
    });
    const summary = buildSummary(report);
    expect(summary).toContain("Primary drivers are");
    expect(summary).toContain("Special Weather Statement");
    expect(summary).toContain("Rip Current Statement");
  });

  it("limits risk entries to 2", () => {
    const report = makeReport({
      activeAlerts: 30,
      topEvents: [
        { event: "Winter Storm Warning", count: 10 },
        { event: "Tornado Warning", count: 5 },
        { event: "Flash Flood Warning", count: 3 },
      ],
    });
    const summary = buildSummary(report);
    // Should only have 2 risk entries separated by "; "
    const risks = summary.replace("Key risks: ", "").replace(". ", "").split("; ");
    expect(risks.length).toBeLessThanOrEqual(2);
  });
});
