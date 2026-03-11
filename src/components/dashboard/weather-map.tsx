"use client";

import maplibregl, { type Map as MapInstance } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { AviationOverlay, OverlayStateInput } from "@/server/types";

interface WeatherMapProps {
  center: { lat: number; lon: number };
  overlays: AviationOverlay[];
  overlayState: OverlayStateInput;
}

function overlaysToFeatureCollection(overlays: AviationOverlay[]) {
  return {
    type: "FeatureCollection",
    features: overlays
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .map((item) => ({
        type: "Feature",
        properties: {
          id: item.id,
          type: item.type,
          severity: item.severity,
          title: item.title,
        },
        geometry: {
          type: "Point",
          coordinates: [item.longitude, item.latitude],
        },
      })),
  } as GeoJSON.FeatureCollection;
}

export function WeatherMap({ center, overlays, overlayState }: WeatherMapProps) {
  const mapRef = useRef<MapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [center.lon, center.lat],
      zoom: 4,
      attributionControl: false,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    mapRef.current.on("load", () => {
      if (!mapRef.current) {
        return;
      }

      mapRef.current.addSource("aviation-overlays", {
        type: "geojson",
        data: overlaysToFeatureCollection(overlays),
      });

      mapRef.current.addLayer({
        id: "overlay-points",
        type: "circle",
        source: "aviation-overlays",
        paint: {
          "circle-radius": 6,
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
          "circle-stroke-color": "#f8fafc",
        },
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lon, overlays]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const source = mapRef.current.getSource("aviation-overlays") as maplibregl.GeoJSONSource;

    if (source) {
      const filtered = overlays.filter((entry) => {
        if (entry.type === "METAR") return overlayState.mapLayerMetar;
        if (entry.type === "TAF") return overlayState.mapLayerTaf;
        if (entry.type === "SIGMET") return overlayState.mapLayerSigmet;
        if (entry.type === "NOTAM") return overlayState.mapLayerNotam;
        return true;
      });

      source.setData(overlaysToFeatureCollection(filtered));
    }
  }, [overlayState, overlays]);

  return <div ref={containerRef} className="h-[320px] w-full rounded-xl border border-slate-200" />;
}
