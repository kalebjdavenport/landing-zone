import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub localStorage before importing the store so the persist middleware
// can initialise without hitting the "storage.setItem is not a function" error.
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: (_index: number) => null,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useDashboardStore } = await import("@/store/dashboard-store");

describe("useDashboardStore", () => {
  beforeEach(() => {
    storage.clear();
    // Reset the store to its initial state before each test
    useDashboardStore.setState({
      selectedLocation: null,
      locationLabel: null,
      routeId: "default",
      overlayState: {
        mapLayerMetar: true,
        mapLayerTaf: true,
        mapLayerSigmet: true,
        mapLayerNotam: false,
        mapLayerRadar: true,
        mapLayerClouds: false,
        mapLayerTemp: false,
      },
      view: "operations",
    });
  });

  it("has correct default state values", () => {
    const state = useDashboardStore.getState();
    expect(state.selectedLocation).toBeNull();
    expect(state.locationLabel).toBeNull();
    expect(state.routeId).toBe("default");
    expect(state.view).toBe("operations");
  });

  it("setLocation updates both selectedLocation and locationLabel", () => {
    useDashboardStore.getState().setLocation(33.6367, -84.4281, "KATL");
    const state = useDashboardStore.getState();
    expect(state.selectedLocation).toEqual({ lat: 33.6367, lon: -84.4281 });
    expect(state.locationLabel).toBe("KATL");
  });

  it("clearLocation resets to null", () => {
    useDashboardStore.getState().setLocation(33.6367, -84.4281, "KATL");
    useDashboardStore.getState().clearLocation();
    const state = useDashboardStore.getState();
    expect(state.selectedLocation).toBeNull();
    expect(state.locationLabel).toBeNull();
  });

  it("setRouteId updates routeId", () => {
    useDashboardStore.getState().setRouteId("route-123");
    expect(useDashboardStore.getState().routeId).toBe("route-123");
  });

  it("toggleLayer flips individual booleans", () => {
    const initialNotam = useDashboardStore.getState().overlayState.mapLayerNotam;
    expect(initialNotam).toBe(false);

    useDashboardStore.getState().toggleLayer("mapLayerNotam");
    expect(useDashboardStore.getState().overlayState.mapLayerNotam).toBe(true);

    useDashboardStore.getState().toggleLayer("mapLayerNotam");
    expect(useDashboardStore.getState().overlayState.mapLayerNotam).toBe(false);
  });

  it("toggleLayer does not affect other layers", () => {
    const before = { ...useDashboardStore.getState().overlayState };
    useDashboardStore.getState().toggleLayer("mapLayerClouds");
    const after = useDashboardStore.getState().overlayState;

    expect(after.mapLayerClouds).toBe(!before.mapLayerClouds);
    expect(after.mapLayerMetar).toBe(before.mapLayerMetar);
    expect(after.mapLayerTaf).toBe(before.mapLayerTaf);
    expect(after.mapLayerSigmet).toBe(before.mapLayerSigmet);
    expect(after.mapLayerRadar).toBe(before.mapLayerRadar);
  });

  it("setView updates view", () => {
    useDashboardStore.getState().setView("architecture");
    expect(useDashboardStore.getState().view).toBe("architecture");

    useDashboardStore.getState().setView("operations");
    expect(useDashboardStore.getState().view).toBe("operations");
  });
});
