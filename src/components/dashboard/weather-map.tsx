"use client";

import maplibregl, { type Map as MapInstance } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { AviationOverlay, OverlayStateInput } from "@/server/types";

// ── Tile sources ──────────────────────────────────────────────────────
const NEXRAD_TILE =
  "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi?" +
  "SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
  "&LAYERS=nexrad-n0q-900913&FORMAT=image/png&TRANSPARENT=true" +
  "&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}";

const OWM_KEY = process.env.NEXT_PUBLIC_OWM_KEY ?? "";
const owmTile = (layer: string) =>
  `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`;

// ── Weather raster layer registry ─────────────────────────────────────
interface WeatherLayer {
  id: string;
  stateKey: keyof OverlayStateInput;
  tiles: string[];
  activeOpacity: number;
}

const WEATHER_LAYERS: WeatherLayer[] = [
  { id: "nexrad-radar", stateKey: "mapLayerRadar", tiles: [NEXRAD_TILE], activeOpacity: 0.7 },
  ...(OWM_KEY
    ? [
        { id: "owm-clouds", stateKey: "mapLayerClouds" as const, tiles: [owmTile("clouds_new")], activeOpacity: 0.5 },
        { id: "owm-temp", stateKey: "mapLayerTemp" as const, tiles: [owmTile("temp_new")], activeOpacity: 0.5 },
      ]
    : []),
];

export const AVAILABLE_WEATHER_KEYS = new Set(WEATHER_LAYERS.map((l) => l.stateKey));

// ── GeoJSON builders ──────────────────────────────────────────────────

/** Points for METAR / TAF / NOTAM station markers. */
function toPointFC(overlays: AviationOverlay[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: overlays
      .filter((o) => o.latitude != null && o.longitude != null && !o.geometry)
      .map((o) => ({
        type: "Feature" as const,
        properties: { id: o.id, type: o.type, severity: o.severity, title: o.title },
        geometry: { type: "Point" as const, coordinates: [o.longitude!, o.latitude!] },
      })),
  };
}

/** Polygon / MultiPolygon features for SIGMETs and area-based NOTAMs. */
function toPolygonFC(overlays: AviationOverlay[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: overlays
      .filter((o) => o.geometry && (o.geometry.type === "Polygon" || o.geometry.type === "MultiPolygon"))
      .map((o) => ({
        type: "Feature" as const,
        properties: { id: o.id, type: o.type, severity: o.severity, title: o.title },
        geometry: o.geometry!,
      })),
  };
}

// ── Severity → colour mapping (shared between fills and circles) ──────
const SEVERITY_COLOR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "severity"],
  "extreme", "#a21caf",
  "high", "#e11d48",
  "moderate", "#d97706",
  "#0f766e",
];

// ── Component ─────────────────────────────────────────────────────────
interface WeatherMapProps {
  center: { lat: number; lon: number };
  /** Already-filtered aviation overlays (parent handles toggle logic). */
  overlays: AviationOverlay[];
  overlayState: OverlayStateInput;
}

export function WeatherMap({ center, overlays, overlayState }: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const readyRef = useRef(false);

  // Refs so the async `load` callback reads current values.
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const stateRef = useRef(overlayState);
  stateRef.current = overlayState;

  // ── 1. Create the map (stable — only re-runs on center change) ──────
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
      const currentOverlays = overlaysRef.current;

      // — Weather raster layers (radar, clouds, temp) —
      for (const layer of WEATHER_LAYERS) {
        map.addSource(layer.id, { type: "raster", tiles: layer.tiles, tileSize: 256 });
        map.addLayer({
          id: layer.id,
          type: "raster",
          source: layer.id,
          paint: { "raster-opacity": stateRef.current[layer.stateKey] ? layer.activeOpacity : 0 },
        });
      }

      // — SIGMET / area polygons (rendered below points) —
      map.addSource("aviation-polygons", { type: "geojson", data: toPolygonFC(currentOverlays) });
      map.addLayer({
        id: "aviation-polygon-fill",
        type: "fill",
        source: "aviation-polygons",
        paint: {
          "fill-color": SEVERITY_COLOR,
          "fill-opacity": 0.25,
        },
      });
      map.addLayer({
        id: "aviation-polygon-outline",
        type: "line",
        source: "aviation-polygons",
        paint: {
          "line-color": SEVERITY_COLOR,
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });

      // — METAR / TAF / NOTAM station points —
      map.addSource("aviation-points", { type: "geojson", data: toPointFC(currentOverlays) });
      map.addLayer({
        id: "aviation-point-circles",
        type: "circle",
        source: "aviation-points",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 6, 6, 10, 10],
          "circle-color": SEVERITY_COLOR,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.85,
        },
      });
      // Labels at higher zoom levels
      map.addLayer({
        id: "aviation-point-labels",
        type: "symbol",
        source: "aviation-points",
        minzoom: 6,
        layout: {
          "text-field": ["get", "title"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      readyRef.current = true;
    });

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lon]);

  // ── 2. Update aviation GeoJSON when filtered overlay list changes ────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    const map = mapRef.current;

    const ptSrc = map.getSource("aviation-points") as maplibregl.GeoJSONSource | undefined;
    ptSrc?.setData(toPointFC(overlays));

    const polySrc = map.getSource("aviation-polygons") as maplibregl.GeoJSONSource | undefined;
    polySrc?.setData(toPolygonFC(overlays));
  }, [overlays]);

  // ── 3. Toggle weather raster opacity ────────────────────────────────
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

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive weather map showing radar, aviation overlays, and station markers"
      className="h-[420px] w-full rounded-xl border border-slate-200"
    />
  );
}
