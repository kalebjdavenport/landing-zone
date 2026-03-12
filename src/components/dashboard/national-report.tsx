import { AlertTriangle, Clock3, Info, ShieldAlert, Siren } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getThreatLevel, buildSummary } from "@/components/dashboard/national-report-utils";
import type { NationalReport } from "@/server/types";

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
