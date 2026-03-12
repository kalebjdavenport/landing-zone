import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import { maxSeverity, severityFromText } from "@/server/services/severity";
import type { AviationOverlay, DispatcherBoard } from "@/server/types";

import { memory } from "./memory-store";
import { listAviationOverlays } from "./overlay-repo";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

const KNOWN_SOURCES = new Set(["SIGMET", "NOTAM", "TAF", "METAR"]);
type HazardSource = "NWS" | "SIGMET" | "NOTAM" | "TAF" | "METAR";

export function normalizeHazardSource(type: string): HazardSource {
  return KNOWN_SOURCES.has(type) ? (type as HazardSource) : "NWS";
}

function createMockRouteBoard(routeId: string, overlays: AviationOverlay[]): DispatcherBoard {
  const severeHazards = overlays.filter((overlay) => overlay.severity === "high");

  return {
    routeId,
    origin: "KATL",
    destination: "KJFK",
    alternates: ["KDCA", "KBOS"],
    risk: severeHazards.length > 0 ? "high" : "moderate",
    lastComputedAt: nowIso(),
    stations: [
      {
        icao: "KATL",
        label: "Atlanta",
        weather: {
          temperatureF: 74,
          visibilityMi: 6,
          windSpeedKt: 18,
          ceilingFt: 2200,
          category: "MVFR",
          observedAt: nowIso(),
        },
      },
      {
        icao: "KJFK",
        label: "New York JFK",
        weather: {
          temperatureF: 61,
          visibilityMi: 3,
          windSpeedKt: 22,
          ceilingFt: 900,
          category: "IFR",
          observedAt: nowIso(),
        },
      },
      {
        icao: "KDCA",
        label: "Washington DCA",
        weather: {
          temperatureF: 64,
          visibilityMi: 5,
          windSpeedKt: 16,
          ceilingFt: 1900,
          category: "MVFR",
          observedAt: nowIso(),
        },
      },
    ],
    activeHazards: overlays.slice(0, 8).map((overlay) => ({
      id: overlay.id,
      source: normalizeHazardSource(overlay.type),
      title: overlay.title,
      severity: overlay.severity,
      effective: overlay.issuedAt,
      expires: overlay.expiresAt,
    })),
    stale: false,
  };
}

export async function getDispatcherBoard(
  supabase: SupabaseClient | null,
  routeId: string,
): Promise<DispatcherBoard> {
  if (!supabase) {
    if (memory.routeBoards.has(routeId)) {
      return memory.routeBoards.get(routeId)!;
    }

    const next = createMockRouteBoard(routeId, memory.overlays);
    memory.routeBoards.set(routeId, next);
    return next;
  }

  const { data: route } = await supabase
    .from("dispatcher_routes")
    .select("route_id,origin,destination,alternates,risk,last_computed_at,stale")
    .eq("route_id", routeId)
    .maybeSingle();

  const overlays = await listAviationOverlays(supabase);

  if (!route) {
    const next = createMockRouteBoard(routeId, overlays);
    await supabase.from("dispatcher_routes").upsert({
      route_id: routeId,
      origin: next.origin,
      destination: next.destination,
      alternates: next.alternates,
      risk: next.risk,
      last_computed_at: next.lastComputedAt,
      stale: next.stale,
      updated_at: nowIso(),
    });

    return next;
  }

  const stationWeather = await supabase
    .from("station_observations")
    .select("icao,label,temperature_f,visibility_mi,wind_speed_kt,ceiling_ft,category,observed_at")
    .in("icao", [route.origin, route.destination, ...(route.alternates ?? [])]);

  const stations = [route.origin, route.destination, ...(route.alternates ?? [])].map((icao) => {
    const row = stationWeather.data?.find((entry) => entry.icao === icao);

    return {
      icao,
      label: row?.label ?? icao,
      weather: row
        ? {
            temperatureF: row.temperature_f,
            visibilityMi: row.visibility_mi,
            windSpeedKt: row.wind_speed_kt,
            ceilingFt: row.ceiling_ft,
            category: row.category,
            observedAt: row.observed_at,
          }
        : null,
    };
  });

  const activeHazards = overlays.slice(0, 10).map((overlay) => ({
    id: overlay.id,
    source: normalizeHazardSource(overlay.type),
    title: overlay.title,
    severity: overlay.severity,
    effective: overlay.issuedAt,
    expires: overlay.expiresAt,
  }));

  const risk = maxSeverity([
    route.risk,
    ...activeHazards.map((hazard) => hazard.severity),
    ...stations.map((station) => severityFromText(station.weather?.category ?? "")),
  ]);

  return {
    routeId: route.route_id,
    origin: route.origin,
    destination: route.destination,
    alternates: route.alternates ?? [],
    risk,
    lastComputedAt: route.last_computed_at,
    stations,
    activeHazards,
    stale: route.stale,
  };
}

export async function upsertStationObservation(
  supabase: SupabaseClient | null,
  input: {
    icao: string;
    label: string;
    temperatureF: number | null;
    visibilityMi: number | null;
    windSpeedKt: number | null;
    ceilingFt: number | null;
    category: "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN";
    observedAt: string;
  },
) {
  if (!supabase) {
    return;
  }

  await supabase.from("station_observations").upsert(
    {
      icao: input.icao,
      label: input.label,
      temperature_f: input.temperatureF,
      visibility_mi: input.visibilityMi,
      wind_speed_kt: input.windSpeedKt,
      ceiling_ft: input.ceilingFt,
      category: input.category,
      observed_at: input.observedAt,
      updated_at: nowIso(),
    },
    { onConflict: "icao" },
  );
}
