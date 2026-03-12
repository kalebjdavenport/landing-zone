import { nowIso } from "@/lib/utils";
import {
  appendDeltaEvent,
  appendDeltaEventsBatch,
  listAviationOverlays,
  replaceAviationOverlays,
  upsertStationObservation,
  upsertLocationWeather,
  upsertNationalReport,
} from "@/server/repositories/weather-repo";
import { fetchAviationOverlays } from "@/server/services/aviation";
import { fetchLocationWeatherFromNws, fetchNationalReportFromNws } from "@/server/services/nws";
import { severityFromText } from "@/server/services/severity";

import type { TrpcContext } from "@/server/api/trpc";
import type { DeltaFeedItem } from "@/server/types";
import {
  DEFAULT_SEED_STATIONS,
  MAX_ALERT_EVENTS_PER_LOCATION,
  MAX_AVIATION_OVERLAY_EVENTS,
} from "./constants";

interface IngestResult {
  success: boolean;
  source: string;
  fetchedAt: string;
  events: number;
  errors: string[];
}

export async function runNwsIngest(
  ctx: TrpcContext,
  seeds: Array<{ lat: number; lon: number; icao?: string; label?: string }> = [...DEFAULT_SEED_STATIONS],
): Promise<IngestResult> {
  const fetchedAt = nowIso();
  const errors: string[] = [];
  let events = 0;

  try {
    const national = await fetchNationalReportFromNws();
    await upsertNationalReport(ctx.supabase, national);
    await appendDeltaEvent(ctx.supabase, {
      type: "briefing.updated",
      severity: national.severeAlerts > 0 ? "high" : "moderate",
      summary: `National briefing updated. ${national.activeAlerts} active alerts`,
      routeId: null,
      locationKey: null,
      occurredAt: fetchedAt,
      payload: national,
    });
    events += 1;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "National ingest failed");
  }

  const seedResults = await Promise.allSettled(
    seeds.map(async (seed) => {
      const weather = await fetchLocationWeatherFromNws(seed.lat, seed.lon);
      await upsertLocationWeather(ctx.supabase, weather);
      if (seed.icao) {
        await upsertStationObservation(ctx.supabase, {
          icao: seed.icao,
          label: seed.label ?? `${weather.point.city}, ${weather.point.state}`,
          temperatureF: weather.current.temperatureF,
          visibilityMi: weather.current.visibilityMi,
          windSpeedKt: weather.current.windSpeedKt,
          ceilingFt: weather.current.ceilingFt,
          category: weather.current.flightCategory,
          observedAt: weather.current.timestamp ?? fetchedAt,
        });
      }

      const seedEvents: Omit<DeltaFeedItem, "id">[] = [
        {
          type: "observation.updated",
          severity: weather.alerts.some((alert) => alert.severity === "high") ? "high" : "low",
          summary: `NWS observation updated for ${weather.point.city}, ${weather.point.state}`,
          routeId: null,
          locationKey: `${seed.lat.toFixed(4)},${seed.lon.toFixed(4)}`,
          occurredAt: fetchedAt,
          payload: {
            city: weather.point.city,
            state: weather.point.state,
            alerts: weather.alerts.length,
          },
        },
        ...weather.alerts.slice(0, MAX_ALERT_EVENTS_PER_LOCATION).map((alert) => ({
          type: "hazard.updated" as const,
          severity: alert.severity,
          summary: `${alert.event}: ${alert.headline}`,
          routeId: null,
          locationKey: `${seed.lat.toFixed(4)},${seed.lon.toFixed(4)}`,
          occurredAt: fetchedAt,
          payload: alert,
        })),
      ];

      return seedEvents;
    }),
  );

  const allSeedEvents: Omit<DeltaFeedItem, "id">[] = [];
  for (const result of seedResults) {
    if (result.status === "fulfilled") {
      allSeedEvents.push(...result.value);
      events += 1;
    } else {
      const reason = result.reason;
      errors.push(
        reason instanceof Error
          ? `Location ingest failed: ${reason.message}`
          : "Location ingest failed",
      );
    }
  }

  if (allSeedEvents.length > 0) {
    await appendDeltaEventsBatch(ctx.supabase, allSeedEvents);
  }

  return {
    success: errors.length === 0,
    source: "nws",
    fetchedAt,
    events,
    errors,
  };
}

export async function runAviationIngest(
  ctx: TrpcContext,
  center?: { lat: number; lon: number },
): Promise<IngestResult> {
  const fetchedAt = nowIso();
  const errors: string[] = [];

  try {
    const previous = await listAviationOverlays(ctx.supabase);
    const overlays = await fetchAviationOverlays(center);
    await replaceAviationOverlays(ctx.supabase, overlays);
    const previousIds = new Set(previous.map((entry) => entry.id));

    const overlayEvents: Omit<DeltaFeedItem, "id">[] = overlays
      .slice(0, MAX_AVIATION_OVERLAY_EVENTS)
      .map((overlay) => ({
        type: (previousIds.has(overlay.id) ? "hazard.updated" : "hazard.created") as DeltaFeedItem["type"],
        severity: overlay.severity,
        summary: `${overlay.type} ${overlay.title}`,
        routeId: "default" as string | null,
        locationKey: overlay.latitude && overlay.longitude ? `${overlay.latitude},${overlay.longitude}` : null,
        occurredAt: fetchedAt,
        payload: overlay as unknown,
      }));

    if (overlayEvents.length > 0) {
      await appendDeltaEventsBatch(ctx.supabase, overlayEvents);
    }
    const events = overlayEvents.length;

    return {
      success: true,
      source: "aviation",
      fetchedAt,
      events,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Aviation ingest failed");

    await appendDeltaEvent(ctx.supabase, {
      type: "hazard.updated",
      severity: severityFromText("aviation ingest failure"),
      summary: "Aviation ingest failed; continuing with NWS-only mode",
      routeId: null,
      locationKey: null,
      occurredAt: fetchedAt,
      payload: {
        error: errors[0],
      },
    });

    return {
      success: false,
      source: "aviation",
      fetchedAt,
      events: 0,
      errors,
    };
  }
}
