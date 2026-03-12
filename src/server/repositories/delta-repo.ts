import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import type { DeltaFeedItem } from "@/server/types";

import { memory, toEventId } from "./memory-store";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

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
