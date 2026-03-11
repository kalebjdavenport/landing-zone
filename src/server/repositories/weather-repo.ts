import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import { maxSeverity, severityFromText } from "@/server/services/severity";
import type {
  AviationOverlay,
  DeltaFeedItem,
  DispatcherBoard,
  LocationWeather,
  NationalReport,
} from "@/server/types";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

const memory = {
  national: null as NationalReport | null,
  locationByKey: new Map<string, LocationWeather>(),
  overlays: [] as AviationOverlay[],
  deltaFeed: [] as DeltaFeedItem[],
  routeBoards: new Map<string, DispatcherBoard>(),
};

function normalizeHazardSource(type: string): "NWS" | "SIGMET" | "NOTAM" | "TAF" | "METAR" {
  if (type === "SIGMET") {
    return "SIGMET";
  }

  if (type === "NOTAM") {
    return "NOTAM";
  }

  if (type === "TAF") {
    return "TAF";
  }

  if (type === "METAR") {
    return "METAR";
  }

  return "NWS";
}

function toEventId() {
  return crypto.randomUUID();
}

export async function getNationalReport(
  supabase: SupabaseClient | null,
): Promise<NationalReport | null> {
  if (!supabase) {
    return memory.national;
  }

  const { data: record } = await supabase
    .from("nws_snapshots")
    .select("generated_at,last_success_at,stale,active_alerts,severe_alerts,top_events")
    .eq("kind", "national")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) {
    return null;
  }

  return {
    generatedAt: record.generated_at,
    lastSuccessAt: record.last_success_at,
    stale: record.stale,
    activeAlerts: record.active_alerts,
    severeAlerts: record.severe_alerts,
    topEvents: record.top_events,
  };
}

export async function upsertNationalReport(
  supabase: SupabaseClient | null,
  report: NationalReport,
) {
  memory.national = report;

  if (!supabase) {
    return;
  }

  await supabase.from("nws_snapshots").upsert(
    {
      kind: "national",
      generated_at: report.generatedAt,
      last_success_at: report.lastSuccessAt,
      stale: report.stale,
      active_alerts: report.activeAlerts,
      severe_alerts: report.severeAlerts,
      top_events: report.topEvents,
      payload: report,
      updated_at: nowIso(),
    },
    { onConflict: "kind" },
  );
}

export async function getLocationWeather(
  supabase: SupabaseClient | null,
  lat: number,
  lon: number,
): Promise<LocationWeather | null> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (!supabase) {
    return memory.locationByKey.get(key) ?? null;
  }

  const { data: record } = await supabase
    .from("nws_snapshots")
    .select("lat,lon,payload")
    .eq("kind", "location")
    .eq("lat", lat)
    .eq("lon", lon)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return record?.payload ?? null;
}

export async function upsertLocationWeather(
  supabase: SupabaseClient | null,
  weather: LocationWeather,
) {
  const key = `${weather.point.lat.toFixed(4)},${weather.point.lon.toFixed(4)}`;
  memory.locationByKey.set(key, weather);

  if (!supabase) {
    return;
  }

  await supabase.from("nws_snapshots").upsert(
    {
      kind: "location",
      lat: weather.point.lat,
      lon: weather.point.lon,
      generated_at: nowIso(),
      last_success_at: weather.lastSuccessAt,
      stale: weather.stale,
      active_alerts: weather.alerts.length,
      severe_alerts: weather.alerts.filter(
        (entry) => entry.severity === "high" || entry.severity === "extreme",
      ).length,
      top_events: [],
      payload: weather,
      updated_at: nowIso(),
    },
    { onConflict: "kind,lat,lon" },
  );
}

export async function replaceAviationOverlays(
  supabase: SupabaseClient | null,
  overlays: AviationOverlay[],
) {
  memory.overlays = overlays;

  if (!supabase) {
    return;
  }

  await supabase.from("aviation_overlays").delete().neq("id", "");

  if (overlays.length) {
    await supabase.from("aviation_overlays").insert(
      overlays.map((entry) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        severity: entry.severity,
        latitude: entry.latitude,
        longitude: entry.longitude,
        geometry: entry.geometry,
        issued_at: entry.issuedAt,
        expires_at: entry.expiresAt,
        raw_text: entry.rawText,
        updated_at: nowIso(),
      })),
    );
  }
}

export async function listAviationOverlays(
  supabase: SupabaseClient | null,
): Promise<AviationOverlay[]> {
  if (!supabase) {
    return memory.overlays;
  }

  const { data } = await supabase
    .from("aviation_overlays")
    .select("id,type,title,severity,latitude,longitude,geometry,issued_at,expires_at,raw_text")
    .order("updated_at", { ascending: false })
    .limit(300);

  return (data ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    severity: item.severity,
    latitude: item.latitude,
    longitude: item.longitude,
    geometry: item.geometry,
    issuedAt: item.issued_at,
    expiresAt: item.expires_at,
    rawText: item.raw_text,
  })) as AviationOverlay[];
}

export async function appendDeltaEvent(
  supabase: SupabaseClient | null,
  event: Omit<DeltaFeedItem, "id">,
) {
  const next = {
    ...event,
    id: toEventId(),
  } satisfies DeltaFeedItem;

  memory.deltaFeed = [next, ...memory.deltaFeed]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 200);

  if (!supabase) {
    return next;
  }

  await supabase.from("event_log").insert({
    id: next.id,
    type: next.type,
    severity: next.severity,
    summary: next.summary,
    route_id: next.routeId,
    location_key: next.locationKey,
    occurred_at: next.occurredAt,
    payload: next.payload,
    created_at: nowIso(),
  });

  return next;
}

export async function getDeltaFeed(
  supabase: SupabaseClient | null,
  since?: string,
): Promise<DeltaFeedItem[]> {
  if (!supabase) {
    const entries = memory.deltaFeed;
    if (!since) {
      return entries;
    }

    return entries.filter((entry) => entry.occurredAt >= since);
  }

  let query = supabase
    .from("event_log")
    .select("id,type,severity,summary,route_id,location_key,occurred_at,payload")
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (since) {
    query = query.gte("occurred_at", since);
  }

  const { data } = await query;

  return (data ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    severity: item.severity,
    summary: item.summary,
    routeId: item.route_id,
    locationKey: item.location_key,
    occurredAt: item.occurred_at,
    payload: item.payload ?? {},
  })) as DeltaFeedItem[];
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
