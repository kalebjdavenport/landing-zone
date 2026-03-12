import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DashboardView } from "@/components/dashboard/view-nav";
import type { OverlayStateInput } from "@/server/types";

interface LocationSlice {
  selectedLocation: { lat: number; lon: number } | null;
  locationLabel: string | null;
  setLocation: (lat: number, lon: number, label: string | null) => void;
  clearLocation: () => void;
}

interface RouteSlice {
  routeId: string;
  setRouteId: (id: string) => void;
}

interface OverlaySlice {
  overlayState: OverlayStateInput;
  toggleLayer: (key: keyof OverlayStateInput) => void;
  setOverlayState: (state: OverlayStateInput) => void;
}

interface ViewSlice {
  view: DashboardView;
  setView: (v: DashboardView) => void;
}

export type DashboardStore = LocationSlice & RouteSlice & OverlaySlice & ViewSlice;

const DEFAULT_OVERLAY: OverlayStateInput = {
  mapLayerMetar: true,
  mapLayerTaf: true,
  mapLayerSigmet: true,
  mapLayerNotam: false,
  mapLayerRadar: true,
  mapLayerClouds: false,
  mapLayerTemp: false,
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      // Location — null until the user searches; persisted across sessions
      selectedLocation: null,
      locationLabel: null,
      setLocation: (lat, lon, label) =>
        set({ selectedLocation: { lat, lon }, locationLabel: label }),
      clearLocation: () =>
        set({ selectedLocation: null, locationLabel: null }),

      // Route
      routeId: "default",
      setRouteId: (id) => set({ routeId: id }),

      // Overlay
      overlayState: DEFAULT_OVERLAY,
      toggleLayer: (key) =>
        set((state) => ({
          overlayState: { ...state.overlayState, [key]: !state.overlayState[key] },
        })),
      setOverlayState: (overlayState) => set({ overlayState }),

      // View
      view: "operations" as DashboardView,
      setView: (view) => set({ view }),
    }),
    {
      name: "dashboard-prefs",
      partialize: (state): Pick<DashboardStore, "overlayState" | "selectedLocation" | "locationLabel"> => ({
        overlayState: state.overlayState,
        selectedLocation: state.selectedLocation,
        locationLabel: state.locationLabel,
      }),
    },
  ),
);
