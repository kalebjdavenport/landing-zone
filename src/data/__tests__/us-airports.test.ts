import { describe, expect, it } from "vitest";

import { searchAirports, MAX_RESULTS } from "@/data/search-airports";

describe("searchAirports", () => {
  it("returns empty array for empty query", () => {
    expect(searchAirports("")).toEqual([]);
    expect(searchAirports("   ")).toEqual([]);
  });

  it("finds exact ICAO match", () => {
    const results = searchAirports("KATL");
    expect(results).toHaveLength(1);
    expect(results[0].icao).toBe("KATL");
    expect(results[0].city).toBe("Atlanta");
  });

  it("finds exact IATA match", () => {
    const results = searchAirports("ATL");
    expect(results).toHaveLength(1);
    expect(results[0].iata).toBe("ATL");
    expect(results[0].city).toBe("Atlanta");
  });

  it("matches ICAO prefix", () => {
    const results = searchAirports("KJ");
    expect(results.length).toBeGreaterThan(0);
    // Should include JFK
    const icaos = results.map((a) => a.icao);
    expect(icaos).toContain("KJFK");
  });

  it("matches city name", () => {
    const results = searchAirports("Chicago");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const icaos = results.map((a) => a.icao);
    expect(icaos).toContain("KORD");
    expect(icaos).toContain("KMDW");
  });

  it("is case insensitive", () => {
    const upper = searchAirports("KATL");
    const lower = searchAirports("katl");
    const mixed = searchAirports("kAtL");
    expect(upper).toEqual(lower);
    expect(upper).toEqual(mixed);
  });

  it("caps results at MAX_RESULTS", () => {
    // "K" matches nearly every airport, so results should be capped
    const results = searchAirports("K");
    expect(results.length).toBeLessThanOrEqual(MAX_RESULTS);
  });

  it("matches state abbreviation", () => {
    const results = searchAirports("AK");
    // AK should match Alaska airports via state field, and also ICAO prefix "AK" codes
    expect(results.length).toBeGreaterThan(0);
  });

  it("deduplicates code matches and text matches", () => {
    // "Atlanta" should appear once even though it matches city and potentially name
    const results = searchAirports("Atlanta");
    const icaos = results.map((a) => a.icao);
    const unique = new Set(icaos);
    expect(icaos.length).toBe(unique.size);
  });
});
