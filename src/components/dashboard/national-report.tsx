import { AlertTriangle, Clock3, ShieldAlert, Siren } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import type { NationalReport } from "@/server/types";

export function NationalReportCard({ report }: { report: NationalReport }) {
  return (
    <Card className="relative overflow-hidden border-cyan-200/60 bg-gradient-to-r from-slate-50 via-cyan-50 to-emerald-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">National Weather Report (NWS)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">Data Status</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <ShieldAlert className="h-4 w-4" />
              {report.stale ? "Stale" : "Current"}
            </div>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="h-4 w-4" />
            Last success {formatDistanceToNow(new Date(report.lastSuccessAt), { addSuffix: true })}
          </div>
          <div className="flex flex-wrap gap-2">
            {report.topEvents.length ? (
              report.topEvents.map((item) => (
                <Badge key={item.event} variant="neutral">
                  {item.event}: {item.count}
                </Badge>
              ))
            ) : (
              <Badge variant="neutral">No dominant event categories right now</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
