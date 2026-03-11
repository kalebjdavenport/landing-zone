"use client";

import { Layers3, MapPinned } from "lucide-react";

import { WeatherMap } from "@/components/dashboard/weather-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { AviationOverlay, OverlayStateInput } from "@/server/types";

interface OverlayMapPanelProps {
  overlays: AviationOverlay[];
  state: OverlayStateInput;
  onStateChange: (state: OverlayStateInput) => void;
  center: { lat: number; lon: number };
}

export function OverlayMapPanel({ overlays, state, onStateChange, center }: OverlayMapPanelProps) {
  const activeOverlays = overlays.filter((overlay) => {
    if (overlay.type === "METAR") return state.mapLayerMetar;
    if (overlay.type === "TAF") return state.mapLayerTaf;
    if (overlay.type === "SIGMET") return state.mapLayerSigmet;
    if (overlay.type === "NOTAM") return state.mapLayerNotam;
    return true;
  });

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
            {activeOverlays.length} overlays
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <Switch
            checked={state.mapLayerMetar}
            onCheckedChange={(checked) => onStateChange({ ...state, mapLayerMetar: checked })}
            label="METAR"
          />
          <Switch
            checked={state.mapLayerTaf}
            onCheckedChange={(checked) => onStateChange({ ...state, mapLayerTaf: checked })}
            label="TAF"
          />
          <Switch
            checked={state.mapLayerSigmet}
            onCheckedChange={(checked) => onStateChange({ ...state, mapLayerSigmet: checked })}
            label="SIGMET"
          />
          <Switch
            checked={state.mapLayerNotam}
            onCheckedChange={(checked) => onStateChange({ ...state, mapLayerNotam: checked })}
            label="NOTAM"
          />
        </div>
        <WeatherMap overlays={activeOverlays} center={center} overlayState={state} />
      </CardContent>
    </Card>
  );
}
