import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import type { AviationOverlay } from "@/server/types";

import { memory } from "./memory-store";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

/** How long cached overlays are considered fresh (ms). */
const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes

/** In-memory timestamp of last successful replace. */
let lastFetchedAt: number = 0;

/** Center used for the most recent fetch (for location-change detection). */
let lastCenter: { lat: number; lon: number } | undefined;

/**
 * True when overlay data is missing, older than STALE_AFTER_MS,
 * or the requested center has moved more than 1° from the last fetch.
 */
export function overlaysAreStale(center?: { lat: number; lon: number }): boolean {
  if (memory.overlays.length === 0) return true;
  if (Date.now() - lastFetchedAt > STALE_AFTER_MS) return true;
  if (center && lastCenter) {
    if (Math.abs(center.lat - lastCenter.lat) > 1 || Math.abs(center.lon - lastCenter.lon) > 1) {
      return true;
    }
  }
  if (center && !lastCenter) return true;
  return false;
}

export async function replaceAviationOverlays(
  supabase: SupabaseClient | null,
  overlays: AviationOverlay[],
  center?: { lat: number; lon: number },
) {
  memory.overlays = overlays;
  lastFetchedAt = Date.now();
  lastCenter = center;

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
