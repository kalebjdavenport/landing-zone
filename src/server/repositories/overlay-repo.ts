import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import type { AviationOverlay } from "@/server/types";

import { memory } from "./memory-store";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

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
