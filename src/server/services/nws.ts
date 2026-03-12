import { addMinutes, subMinutes } from "date-fns";

import { nowIso } from "@/lib/utils";
import { severityFromText } from "@/server/services/severity";
import type { LocationWeather, NationalReport } from "@/server/types";

const NWS_BASE_URL = "https://api.weather.gov";
const USER_AGENT =
  process.env.NWS_USER_AGENT ?? "LandingZone/1.0 (interview@infotrak.local)";

/** NWS API caps practical alert processing at this count */
const MAX_ALERTS_TO_PROCESS = 400;

/** Number of forecast periods to include in location weather */
const FORECAST_PERIOD_LIMIT = 8;

/** m/s to knots conversion factor */
const MS_TO_KNOTS = 1.94384;

/** Round knot values to nearest increment */
const KNOT_ROUNDING = 5;

async function nwsFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${NWS_BASE_URL}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
    next: {
      revalidate: 120,
    },
  });

  if (!response.ok) {
    throw new Error(`NWS request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

export function mapNwsSeverity(input: string | null | undefined) {
  if (!input) {
    return "low" as const;
  }

  const normalized = input.toLowerCase();
  if (normalized === "extreme") {
    return "extreme" as const;
  }

  if (normalized === "severe") {
    return "high" as const;
  }

  if (normalized === "moderate") {
    return "moderate" as const;
  }

  return "low" as const;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  return null;
}

function celsiusToFahrenheit(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return (value * 9) / 5 + 32;
}

interface NwsAlertsCountResponse {
  total?: number;
  areas?: Record<string, number>;
  regions?: Record<string, number>;
}

interface NwsAlertFeature {
  id: string;
  properties: {
    event: string;
    severity: string | null;
    headline: string | null;
    senderName: string | null;
    effective: string | null;
    expires: string | null;
  };
}

interface NwsAlertsResponse {
  features: NwsAlertFeature[];
}

interface NwsPointsResponse {
  properties: {
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    observationStations: string;
  };
}

interface NwsForecastResponse {
  properties: {
    periods: Array<{
      startTime: string;
      endTime: string;
      temperature: number;
      temperatureUnit: string;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
    }>;
  };
}

interface NwsObservationResponse {
  properties: {
    timestamp: string;
    textDescription: string | null;
    temperature: { value: number | null };
    relativeHumidity: { value: number | null };
    windSpeed: { value: number | null };
    windDirection: { value: number | null };
  };
}

interface NwsObservationStationsResponse {
  features: Array<{ id: string }>;
}

function formatWindSpeed(windSpeedMs: number | null): string | null {
  if (windSpeedMs === null) {
    return null;
  }

  return `${Math.round((windSpeedMs * MS_TO_KNOTS) / KNOT_ROUNDING) * KNOT_ROUNDING} kt`;
}

function formatWindDirection(degrees: number | null | undefined): string | null {
  if (degrees === null || degrees === undefined) {
    return null;
  }

  return `${Math.round(degrees)}°`;
}

async function fetchLatestObservation(stationUrl: string): Promise<NwsObservationResponse | null> {
  const response = await fetch(`${stationUrl}/observations/latest`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
    next: {
      revalidate: 180,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<NwsObservationResponse>;
}

/** Parse a wind speed string like "15 kt" or "10 mph" into knots, or null */
export function parseWindSpeedKt(windString: string | null): number | null {
  if (!windString) {
    return null;
  }

  const numeric = Number(windString.replace(/[^0-9.]/g, ""));
  return Number.isNaN(numeric) ? null : numeric;
}

export async function fetchNationalReportFromNws(): Promise<NationalReport> {
  const generatedAt = nowIso();

  try {
    const [countResponse, alertsResponse] = await Promise.all([
      nwsFetch<NwsAlertsCountResponse>("/alerts/active/count"),
      nwsFetch<NwsAlertsResponse>("/alerts/active?status=actual&message_type=alert"),
    ]);

    const topEvents = new Map<string, number>();
    let severeAlerts = 0;

    for (const feature of alertsResponse.features.slice(0, MAX_ALERTS_TO_PROCESS)) {
      const eventName = feature.properties.event || "Unknown";
      topEvents.set(eventName, (topEvents.get(eventName) ?? 0) + 1);

      const sev = mapNwsSeverity(feature.properties.severity);
      if (sev === "high" || sev === "extreme") {
        severeAlerts += 1;
      }
    }

    return {
      generatedAt,
      stale: false,
      lastSuccessAt: generatedAt,
      activeAlerts: countResponse.total ?? alertsResponse.features.length,
      severeAlerts,
      topEvents: [...topEvents.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([event, count]) => ({ event, count })),
    };
  } catch {
    return {
      generatedAt,
      stale: true,
      lastSuccessAt: subMinutes(new Date(), 30).toISOString(),
      activeAlerts: 0,
      severeAlerts: 0,
      topEvents: [],
    };
  }
}

export async function fetchLocationWeatherFromNws(
  lat: number,
  lon: number,
): Promise<LocationWeather> {
  const generatedAt = nowIso();

  const points = await nwsFetch<NwsPointsResponse>(`/points/${lat},${lon}`);

  const [forecastResponse, stationResponse, alertsResponse] = await Promise.all([
    fetch(points.properties.forecast, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
      },
      next: {
        revalidate: 300,
      },
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed forecast request (${res.status})`);
      }

      return res.json() as Promise<NwsForecastResponse>;
    }),
    fetch(points.properties.observationStations, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
      },
      next: {
        revalidate: 300,
      },
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed station request (${res.status})`);
      }

      return res.json() as Promise<NwsObservationStationsResponse>;
    }),
    nwsFetch<NwsAlertsResponse>(`/alerts/active?point=${lat},${lon}`),
  ]);

  const latestObservation = stationResponse.features[0]?.id
    ? await fetchLatestObservation(stationResponse.features[0].id)
    : null;

  return {
    point: {
      lat,
      lon,
      city: points.properties.relativeLocation.properties.city,
      state: points.properties.relativeLocation.properties.state,
      gridId: points.properties.gridId,
      gridX: points.properties.gridX,
      gridY: points.properties.gridY,
      forecastUrl: points.properties.forecast,
      hourlyForecastUrl: points.properties.forecastHourly,
      stationUrl: points.properties.observationStations,
    },
    current: {
      temperatureF: celsiusToFahrenheit(
        parseNumber(latestObservation?.properties.temperature.value ?? null),
      ),
      windSpeed: formatWindSpeed(latestObservation?.properties.windSpeed.value ?? null),
      windDirection: formatWindDirection(latestObservation?.properties.windDirection.value),
      textDescription: latestObservation?.properties.textDescription ?? null,
      relativeHumidity: parseNumber(latestObservation?.properties.relativeHumidity.value ?? null),
      timestamp: latestObservation?.properties.timestamp ?? null,
    },
    forecast: forecastResponse.properties.periods.slice(0, FORECAST_PERIOD_LIMIT),
    alerts: alertsResponse.features.map((feature) => ({
      id: feature.id,
      event: feature.properties.event,
      severity: mapNwsSeverity(feature.properties.severity),
      headline: feature.properties.headline ?? feature.properties.event,
      effective: feature.properties.effective,
      expires: feature.properties.expires,
      senderName: feature.properties.senderName,
    })),
    lastSuccessAt: generatedAt,
    stale: false,
  };
}

export function computeStale(lastSuccessAt: string | null, maxAgeMinutes: number) {
  if (!lastSuccessAt) {
    return true;
  }

  return new Date(lastSuccessAt).getTime() < addMinutes(new Date(), -maxAgeMinutes).getTime();
}

export function createAlertSummary(event: string, headline: string | null) {
  return severityFromText(`${event} ${headline ?? ""}`);
}
