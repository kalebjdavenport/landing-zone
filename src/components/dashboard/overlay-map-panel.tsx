"use client";

import { Layers3, MapPinned } from "lucide-react";

import { WeatherMap } from "@/components/dashboard/weather-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AviationOverlay, OverlayStateInput } from "@/server/types";

const ALL_ON: OverlayStateInput = {
  mapLayerMetar: true,
  mapLayerTaf: true,
  mapLayerSigmet: true,
  mapLayerNotam: true,
  mapLayerRadar: true,
  mapLayerClouds: true,
  mapLayerTemp: true,
};

const LEGEND_ITEMS = [
  { label: "METAR", desc: "Current observations", color: "bg-teal-600" },
  { label: "TAF", desc: "Terminal forecasts", color: "bg-teal-600" },
  { label: "SIGMET", desc: "Significant weather", color: "bg-amber-500" },
  { label: "NOTAM", desc: "Notices to airmen", color: "bg-rose-600" },
];

interface OverlayMapPanelProps {
  overlays: AviationOverlay[];
  center: { lat: number; lon: number };
}

export function OverlayMapPanel({ overlays, center }: OverlayMapPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <MapPinned className="h-4 w-4" />
            Weather Overlay Map
          </span>
          <Badge variant="neutral">
            <Layers3 className="mr-1 h-3 w-3" />
            {overlays.length} overlays
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="font-medium">{item.label}</span>
              <span className="text-slate-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <WeatherMap overlays={overlays} center={center} overlayState={ALL_ON} />
      </CardContent>
    </Card>
  );
}
