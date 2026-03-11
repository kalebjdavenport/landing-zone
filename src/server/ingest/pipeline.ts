import { nowIso } from "@/lib/utils";
import {
  appendDeltaEvent,
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

interface IngestResult {
  success: boolean;
  source: string;
  fetchedAt: string;
  events: number;
  errors: string[];
}

export async function runNwsIngest(
  ctx: TrpcContext,
  seeds: Array<{ lat: number; lon: number; icao?: string; label?: string }> = [
    { lat: 33.6367, lon: -84.4281, icao: "KATL", label: "Atlanta" },
    { lat: 40.6413, lon: -73.7781, icao: "KJFK", label: "New York JFK" },
    { lat: 38.8512, lon: -77.0402, icao: "KDCA", label: "Washington DCA" },
  ],
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

  for (const seed of seeds) {
    try {
      const weather = await fetchLocationWeatherFromNws(seed.lat, seed.lon);
      await upsertLocationWeather(ctx.supabase, weather);
      if (seed.icao) {
        await upsertStationObservation(ctx.supabase, {
          icao: seed.icao,
          label: seed.label ?? `${weather.point.city}, ${weather.point.state}`,
          temperatureF: weather.current.temperatureF,
          visibilityMi: null,
          windSpeedKt: weather.current.windSpeed
            ? Number(weather.current.windSpeed.replace(/[^0-9.]/g, "")) || null
            : null,
          ceilingFt: null,
          category: weather.alerts.some((alert) => alert.severity === "high")
            ? "IFR"
            : weather.alerts.some((alert) => alert.severity === "moderate")
              ? "MVFR"
              : "VFR",
          observedAt: weather.current.timestamp ?? fetchedAt,
        });
      }

      await appendDeltaEvent(ctx.supabase, {
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
      });
      events += 1;

      for (const alert of weather.alerts.slice(0, 5)) {
        await appendDeltaEvent(ctx.supabase, {
          type: "hazard.updated",
          severity: alert.severity,
          summary: `${alert.event}: ${alert.headline}`,
          routeId: null,
          locationKey: `${seed.lat.toFixed(4)},${seed.lon.toFixed(4)}`,
          occurredAt: fetchedAt,
          payload: alert,
        });
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `Location ingest failed for ${seed.lat},${seed.lon}: ${error.message}`
          : `Location ingest failed for ${seed.lat},${seed.lon}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    source: "nws",
    fetchedAt,
    events,
    errors,
  };
}

export async function runAviationIngest(ctx: TrpcContext): Promise<IngestResult> {
  const fetchedAt = nowIso();
  const errors: string[] = [];

  try {
    const previous = await listAviationOverlays(ctx.supabase);
    const overlays = await fetchAviationOverlays();
    await replaceAviationOverlays(ctx.supabase, overlays);
    const previousIds = new Set(previous.map((entry) => entry.id));

    let events = 0;
    for (const overlay of overlays.slice(0, 50)) {
      const nextType = previousIds.has(overlay.id) ? "hazard.updated" : "hazard.created";
      await appendDeltaEvent(ctx.supabase, {
        type: nextType,
        severity: overlay.severity,
        summary: `${overlay.type} ${overlay.title}`,
        routeId: "default",
        locationKey: overlay.latitude && overlay.longitude ? `${overlay.latitude},${overlay.longitude}` : null,
        occurredAt: fetchedAt,
        payload: overlay,
      });
      events += 1;
    }

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
