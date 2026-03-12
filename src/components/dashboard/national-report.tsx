import { AlertTriangle, Clock3, Info, ShieldAlert, Siren } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { NationalReport } from "@/server/types";

function getThreatLevel(severeAlerts: number) {
  if (severeAlerts >= 150)
    return { label: "Extreme", color: "text-rose-700", bg: "bg-rose-100 border-rose-300" };
  if (severeAlerts >= 50)
    return { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-300" };
  if (severeAlerts >= 10)
    return { label: "Moderate", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" };
  return { label: "Low", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" };
}

// Map NWS event names to dispatcher-relevant risk guidance
const HIGH_RISK_PATTERNS: Record<string, string> = {
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

function buildSummary(report: NationalReport): string {
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

export function NationalReportCard({ report }: { report: NationalReport }) {
  const threat = getThreatLevel(report.severeAlerts);
  const summary = buildSummary(report);

  return (
    <Card className="relative overflow-hidden border-cyan-200/60 bg-gradient-to-r from-slate-50 via-cyan-50 to-emerald-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">National Weather Report</CardTitle>
          <Badge className={`${threat.bg} ${threat.color} border text-xs font-semibold`}>
            Threat Level: {threat.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">Active Alerts</div>
            <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Siren className="h-4 w-4" />
              {report.activeAlerts}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">Severe Alerts</div>
            <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              {report.severeAlerts}
            </div>
          </div>
        </div>

        {/* Dynamic summary */}
        <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${threat.bg}`}>
          <ShieldAlert className={`mt-0.5 h-4 w-4 shrink-0 ${threat.color}`} />
          <span className={`font-medium ${threat.color}`}>{summary}</span>
        </div>

        {report.activeAlerts > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Check Route Board below for affected segments.
          </div>
        )}

        <Separator />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            Updated {formatDistanceToNow(new Date(report.lastSuccessAt), { addSuffix: true })}
            {report.stale ? " (stale)" : ""}
          </span>
          <span className="text-slate-300">|</span>
          <span>Source: NWS</span>
        </div>
        {report.topEvents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {report.topEvents.map((item) => (
              <Badge key={item.event} variant="neutral">
                {item.event}: {item.count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
