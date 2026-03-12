import type { NationalReport } from "@/server/types";

export function getThreatLevel(severeAlerts: number) {
  if (severeAlerts >= 150)
    return { label: "Extreme", color: "text-rose-700", bg: "bg-rose-100 border-rose-300" };
  if (severeAlerts >= 50)
    return { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-300" };
  if (severeAlerts >= 10)
    return { label: "Moderate", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" };
  return { label: "Low", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" };
}

// Map NWS event names to dispatcher-relevant risk guidance
export const HIGH_RISK_PATTERNS: Record<string, string> = {
  "Winter Storm": "icing and low visibility risk for en-route segments",
  "Blizzard": "zero visibility and severe icing — likely ground stops",
  "Ice Storm": "severe icing risk at all altitudes",
  "Heavy Freezing Spray": "marine/coastal icing hazard for low-altitude routes",
  "Gale Warning": "strong low-level winds and turbulence near coasts",
  "High Wind": "turbulence and crosswind risk at all airports",
  "Wind Advisory": "moderate crosswind risk at exposed airports",
  "Tornado": "convective activity — reroute around affected area",
  "Severe Thunderstorm": "convection, hail, and windshear risk",
  "Flood": "potential airport surface flooding and diversions",
  "Flash Flood": "rapid onset — check TAFs for affected terminals",
  "Hurricane": "widespread closures — expect major rerouting",
  "Tropical Storm": "sustained winds and heavy precip across wide area",
  "Dense Fog": "IFR/LIFR conditions — check ceiling and visibility",
  "Freezing Rain": "icing on approach and departure surfaces",
  "Red Flag": "fire weather — smoke may reduce visibility",
  "Extreme Cold": "de-icing delays and equipment restrictions",
  "Heat Advisory": "density altitude concerns for high-elevation airports",
};

export function buildSummary(report: NationalReport): string {
  const { activeAlerts, topEvents } = report;

  if (activeAlerts === 0) return "No active weather alerts nationwide.";
  if (topEvents.length === 0) return "Active alerts reported — details pending next ingest cycle.";

  // Find the highest-risk events that match our known patterns
  const risks: string[] = [];
  for (const event of topEvents) {
    // Match against known patterns (partial match to handle "Winter Storm Warning" etc.)
    for (const [pattern, guidance] of Object.entries(HIGH_RISK_PATTERNS)) {
      if (event.event.includes(pattern)) {
        risks.push(guidance);
        break;
      }
    }
    if (risks.length >= 2) break;
  }

  if (risks.length === 0) {
    // Fallback: just name the top events
    const names = topEvents.slice(0, 2).map((e) => e.event).join(" and ");
    return `Primary drivers are ${names}.`;
  }

  return `Key risks: ${risks.join("; ")}. `;
}
