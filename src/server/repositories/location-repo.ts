import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import type { LocationWeather } from "@/server/types";

import { memory } from "./memory-store";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

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
