import { describe, expect, it } from "vitest";

import { flightCategoryStyle } from "@/components/dashboard/flight-category";

describe("flightCategoryStyle", () => {
  it("returns green tones for VFR", () => {
    const style = flightCategoryStyle("VFR");
    expect(style.bg).toContain("emerald");
    expect(style.text).toContain("emerald");
  });

  it("returns blue tones for MVFR", () => {
    const style = flightCategoryStyle("MVFR");
    expect(style.bg).toContain("blue");
    expect(style.text).toContain("blue");
  });

  it("returns red tones for IFR", () => {
    const style = flightCategoryStyle("IFR");
    expect(style.bg).toContain("red");
    expect(style.text).toContain("red");
  });

  it("returns magenta/fuchsia tones for LIFR", () => {
    const style = flightCategoryStyle("LIFR");
    expect(style.bg).toContain("fuchsia");
    expect(style.text).toContain("fuchsia");
  });

  it("returns neutral tones for UNKNOWN", () => {
    const style = flightCategoryStyle("UNKNOWN");
    expect(style.bg).toContain("slate");
    expect(style.text).toContain("slate");
  });
});
