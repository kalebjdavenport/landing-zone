import { nowIso } from "@/lib/utils";
import type { TrpcContext } from "@/server/api/trpc";
import type { NationalReport } from "@/server/types";

import { memory } from "./memory-store";

type SupabaseClient = NonNullable<TrpcContext["supabase"]>;

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
