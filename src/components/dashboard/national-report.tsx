import { AlertTriangle, ArrowDown, Clock3, Siren } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { NationalReport } from "@/server/types";

function getThreatLevel(severeAlerts: number) {
  if (severeAlerts >= 150)
    return {
      label: "Extreme",
      color: "text-rose-700",
      bg: "bg-rose-100 border-rose-300",
      guidance: "Nationwide severe weather — verify every route before release.",
    };
  if (severeAlerts >= 50)
    return {
      label: "High",
      color: "text-orange-700",
      bg: "bg-orange-100 border-orange-300",
      guidance: "Elevated severe activity — review Route Board for impacts before dispatch.",
    };
  if (severeAlerts >= 10)
    return {
      label: "Moderate",
      color: "text-amber-700",
      bg: "bg-amber-100 border-amber-300",
      guidance: "Some severe alerts active — check Route Board for affected areas.",
    };
  return {
    label: "Low",
    color: "text-emerald-700",
    bg: "bg-emerald-100 border-emerald-300",
    guidance: "Minimal severe weather nationwide.",
  };
}

export function NationalReportCard({ report }: { report: NationalReport }) {
  const threat = getThreatLevel(report.severeAlerts);

  return (
    <Card className="relative overflow-hidden border-cyan-200/60 bg-gradient-to-r from-slate-50 via-cyan-50 to-emerald-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">National Weather Report</CardTitle>
          <Badge className={`${threat.bg} ${threat.color} border text-xs font-semibold`}>
            {threat.label}
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

        {/* Dispatcher guidance */}
        <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${threat.bg}`}>
          <ArrowDown className={`mt-0.5 h-4 w-4 shrink-0 ${threat.color}`} />
          <span className={`font-medium ${threat.color}`}>{threat.guidance}</span>
        </div>

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
