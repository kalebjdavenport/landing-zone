"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { findAirportByCoords, formatAirportLabel } from "@/data/us-airports";
import { useDashboardStore } from "@/store/dashboard-store";

/**
 * Resolve a display label for the given coords.
 * Priority: explicit URL param → persisted store value → reverse airport lookup → null.
 */
function resolveLabel(
  urlLabel: string | null,
  storeLabel: string | null,
  lat: number,
  lon: number,
): string | null {
  if (urlLabel) return urlLabel;
  if (storeLabel) return storeLabel;
  const airport = findAirportByCoords(lat, lon);
  return airport ? formatAirportLabel(airport) : null;
}

export function useUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setLocation = useDashboardStore((s) => s.setLocation);
  const setView = useDashboardStore((s) => s.setView);
  const selectedLocation = useDashboardStore((s) => s.selectedLocation);
  const locationLabel = useDashboardStore((s) => s.locationLabel);
  const view = useDashboardStore((s) => s.view);

  // Hydrate store from URL once Zustand persist has finished restoring localStorage
  const didSync = useRef(false);
  useEffect(() => {
    if (didSync.current) return;

    if (!useDashboardStore.persist.hasHydrated()) {
      const unsub = useDashboardStore.persist.onFinishHydration(() => {
        unsub();
        didSync.current = false; // re-trigger
      });
      return;
    }

    didSync.current = true;

    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const viewParam = searchParams.get("view");

    if (lat && lon) {
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        const label = resolveLabel(
          searchParams.get("label"),
          useDashboardStore.getState().locationLabel,
          parsedLat,
          parsedLon,
        );
        setLocation(parsedLat, parsedLon, label);
      }
    }

    if (viewParam === "operations" || viewParam === "architecture") {
      setView(viewParam);
    }
  }, [searchParams, setLocation, setView, selectedLocation]);

  // Push store changes to URL
  useEffect(() => {
    if (!didSync.current) return;

    const params = new URLSearchParams();
    if (selectedLocation) {
      params.set("lat", selectedLocation.lat.toFixed(4));
      params.set("lon", selectedLocation.lon.toFixed(4));
    }
    if (locationLabel) {
      params.set("label", locationLabel);
    }
    if (view !== "operations") {
      params.set("view", view);
    }
    const search = params.toString();
    router.replace(search ? `?${search}` : "/", { scroll: false });
  }, [selectedLocation, locationLabel, view, router]);
}
