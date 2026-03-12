"use client";

import maplibregl, { type Map as MapInstance } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { AviationOverlay, OverlayStateInput } from "@/server/types";

// ── Tile sources ──────────────────────────────────────────────────────
// NEXRAD composite radar — Iowa State Mesonet (free, no key required)
const NEXRAD_TILE =
  "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi?" +
  "SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
  "&LAYERS=nexrad-n0q-900913&FORMAT=image/png&TRANSPARENT=true" +
  "&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}";

// OpenWeatherMap (free tier — only usable when NEXT_PUBLIC_OWM_KEY is set)
const OWM_KEY = process.env.NEXT_PUBLIC_OWM_KEY ?? "";
const owmTile = (layer: string) =>
  `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`;

// ── Layer registry ────────────────────────────────────────────────────
interface WeatherLayer {
  id: string;
  stateKey: keyof OverlayStateInput;
  tiles: string[];
  activeOpacity: number;
}

// Build the list at module level — OWM layers only included when key exists
const WEATHER_LAYERS: WeatherLayer[] = [
  { id: "nexrad-radar", stateKey: "mapLayerRadar", tiles: [NEXRAD_TILE], activeOpacity: 0.7 },
  ...(OWM_KEY
    ? [
        { id: "owm-clouds", stateKey: "mapLayerClouds" as const, tiles: [owmTile("clouds_new")], activeOpacity: 0.5 },
        { id: "owm-temp", stateKey: "mapLayerTemp" as const, tiles: [owmTile("temp_new")], activeOpacity: 0.5 },
      ]
    : []),
];

/** Which weather layer keys are actually available (exported for the toggle panel). */
export const AVAILABLE_WEATHER_KEYS = new Set(WEATHER_LAYERS.map((l) => l.stateKey));

// ── Helpers ───────────────────────────────────────────────────────────
function toFeatureCollection(overlays: AviationOverlay[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: overlays
      .filter((o) => o.latitude != null && o.longitude != null)
      .map((o) => ({
        type: "Feature" as const,
        properties: { id: o.id, type: o.type, severity: o.severity, title: o.title },
        geometry: { type: "Point" as const, coordinates: [o.longitude!, o.latitude!] },
      })),
  };
}

// ── Component ─────────────────────────────────────────────────────────
interface WeatherMapProps {
  center: { lat: number; lon: number };
  /** Already-filtered aviation overlays (parent handles the METAR/TAF/… toggle logic). */
  overlays: AviationOverlay[];
  overlayState: OverlayStateInput;
}

export function WeatherMap({ center, overlays, overlayState }: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const readyRef = useRef(false);

  // Keep latest props in refs so the one-time `load` callback picks up current values.
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const stateRef = useRef(overlayState);
  stateRef.current = overlayState;

  // ── 1. Create the map (only re-runs when center moves) ─────────────
  useEffect(() => {
    if (!containerRef.current) return;
    readyRef.current = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: [center.lon, center.lat],
      zoom: 4,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Weather raster layers
      for (const layer of WEATHER_LAYERS) {
        map.addSource(layer.id, { type: "raster", tiles: layer.tiles, tileSize: 256 });
        map.addLayer({
          id: layer.id,
          type: "raster",
          source: layer.id,
          paint: {
            "raster-opacity": stateRef.current[layer.stateKey] ? layer.activeOpacity : 0,
          },
        });
      }

      // Aviation point markers (rendered on top)
      map.addSource("aviation-overlays", {
        type: "geojson",
        data: toFeatureCollection(overlaysRef.current),
      });
      map.addLayer({
        id: "overlay-points",
        type: "circle",
        source: "aviation-overlays",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "severity"],
            "high",
            "#e11d48",
            "extreme",
            "#a21caf",
            "moderate",
            "#d97706",
            "#0f766e",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      readyRef.current = true;
    });

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // Only re-create the map when the geographic center changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lon]);

  // ── 2. Sync aviation overlay GeoJSON when the filtered list changes ─
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    const src = mapRef.current.getSource("aviation-overlays") as maplibregl.GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(overlays));
  }, [overlays]);

  // ── 3. Toggle weather-layer opacity when any toggle changes ─────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    const map = mapRef.current;
    for (const layer of WEATHER_LAYERS) {
      if (map.getLayer(layer.id)) {
        map.setPaintProperty(
          layer.id,
          "raster-opacity",
          overlayState[layer.stateKey] ? layer.activeOpacity : 0,
        );
      }
    }
  }, [overlayState]);

  return <div ref={containerRef} className="h-[420px] w-full rounded-xl border border-slate-200" />;
}
