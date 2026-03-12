"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useDashboardStore } from "@/store/dashboard-store";

export function useUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setLocation = useDashboardStore((s) => s.setLocation);
  const setView = useDashboardStore((s) => s.setView);
  const selectedLocation = useDashboardStore((s) => s.selectedLocation);
  const view = useDashboardStore((s) => s.view);

  // Hydrate store from URL on mount (runs once)
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const viewParam = searchParams.get("view");

    if (lat && lon) {
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        setLocation(parsedLat, parsedLon, null);
      }
    }

    if (viewParam === "operations" || viewParam === "architecture") {
      setView(viewParam);
    }
  }, [searchParams, setLocation, setView]);

  // Push store changes to URL
  useEffect(() => {
    if (!hydrated.current) return;

    const params = new URLSearchParams();
    if (selectedLocation) {
      params.set("lat", selectedLocation.lat.toFixed(4));
      params.set("lon", selectedLocation.lon.toFixed(4));
    }
    if (view !== "operations") {
      params.set("view", view);
    }
    const search = params.toString();
    router.replace(search ? `?${search}` : "/", { scroll: false });
  }, [selectedLocation, view, router]);
}
