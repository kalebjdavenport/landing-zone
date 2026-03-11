import { Plane, Radar, TriangleAlert } from "lucide-react";

import { severityBadgeVariant, severityLabel } from "@/components/dashboard/severity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import type { DispatcherBoard } from "@/server/types";

export function RouteBoardCard({ board }: { board: DispatcherBoard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Dispatcher Route Board
          </span>
          <Badge variant={severityBadgeVariant(board.risk)}>{severityLabel(board.risk)} Risk</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-2">
            <div className="text-xs text-slate-500">Origin</div>
            <div className="font-semibold text-slate-900">{board.origin}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="text-xs text-slate-500">Destination</div>
            <div className="font-semibold text-slate-900">{board.destination}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="text-xs text-slate-500">Alternates</div>
            <div className="font-semibold text-slate-900">{board.alternates.join(", ") || "None"}</div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Temp</TableHead>
              <TableHead>Wind</TableHead>
              <TableHead>Ceiling</TableHead>
              <TableHead>Flight Cat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {board.stations.map((station) => (
              <TableRow key={station.icao}>
                <TableCell className="font-medium">
                  {station.icao}
                  <div className="text-xs text-slate-500">{station.label}</div>
                </TableCell>
                <TableCell>{station.weather ? `${station.weather.temperatureF ?? "--"} F` : "--"}</TableCell>
                <TableCell>{station.weather ? `${station.weather.windSpeedKt ?? "--"} kt` : "--"}</TableCell>
                <TableCell>{station.weather ? `${station.weather.ceilingFt ?? "--"} ft` : "--"}</TableCell>
                <TableCell>{station.weather?.category ?? "UNKNOWN"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Radar className="h-4 w-4" />
            Active Hazards
          </div>
          <div className="flex flex-wrap gap-2">
            {board.activeHazards.length ? (
              board.activeHazards.map((hazard) => (
                <Badge key={hazard.id} variant={severityBadgeVariant(hazard.severity)}>
                  <TriangleAlert className="mr-1 h-3 w-3" />
                  {hazard.source}: {hazard.title}
                </Badge>
              ))
            ) : (
              <Badge variant="neutral">No active route hazards</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Updated {formatDistanceToNow(new Date(board.lastComputedAt), { addSuffix: true })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
