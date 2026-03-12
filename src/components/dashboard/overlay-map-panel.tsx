"use client";

import { Cloud, Layers3, MapPinned, Radar, Thermometer } from "lucide-react";

import { AVAILABLE_WEATHER_KEYS, WeatherMap } from "@/components/dashboard/weather-map";
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
  const activeOverlays = overlays.filter((o) => {
    if (o.type === "METAR") return state.mapLayerMetar;
    if (o.type === "TAF") return state.mapLayerTaf;
    if (o.type === "SIGMET") return state.mapLayerSigmet;
    if (o.type === "NOTAM") return state.mapLayerNotam;
    return true;
  });

  const toggle = (key: keyof OverlayStateInput, value: boolean) =>
    onStateChange({ ...state, [key]: value });

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
        {/* Weather raster layers — only show toggles for layers the map can render */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Weather</span>
          {AVAILABLE_WEATHER_KEYS.has("mapLayerRadar") && (
            <div className="flex items-center gap-1.5">
              <Radar className="h-3.5 w-3.5 text-emerald-600" />
              <Switch checked={state.mapLayerRadar} onCheckedChange={(v) => toggle("mapLayerRadar", v)} label="Radar" />
            </div>
          )}
          {AVAILABLE_WEATHER_KEYS.has("mapLayerClouds") && (
            <div className="flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-slate-500" />
              <Switch checked={state.mapLayerClouds} onCheckedChange={(v) => toggle("mapLayerClouds", v)} label="Clouds" />
            </div>
          )}
          {AVAILABLE_WEATHER_KEYS.has("mapLayerTemp") && (
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-orange-500" />
              <Switch checked={state.mapLayerTemp} onCheckedChange={(v) => toggle("mapLayerTemp", v)} label="Temp" />
            </div>
          )}
        </div>

        {/* Aviation point-data layers */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Aviation</span>
          <Switch checked={state.mapLayerMetar} onCheckedChange={(v) => toggle("mapLayerMetar", v)} label="METAR" />
          <Switch checked={state.mapLayerTaf} onCheckedChange={(v) => toggle("mapLayerTaf", v)} label="TAF" />
          <Switch checked={state.mapLayerSigmet} onCheckedChange={(v) => toggle("mapLayerSigmet", v)} label="SIGMET" />
          <Switch checked={state.mapLayerNotam} onCheckedChange={(v) => toggle("mapLayerNotam", v)} label="NOTAM" />
        </div>

        <WeatherMap overlays={activeOverlays} center={center} overlayState={state} />
      </CardContent>
    </Card>
  );
}
