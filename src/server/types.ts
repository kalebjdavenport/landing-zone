export type Severity = "low" | "moderate" | "high" | "extreme";

export interface NwsLocationPoint {
  lat: number;
  lon: number;
  city: string;
  state: string;
  gridId: string;
  gridX: number;
  gridY: number;
  forecastUrl: string;
  hourlyForecastUrl: string;
  stationUrl: string;
}

export interface LocationWeather {
  point: NwsLocationPoint;
  current: {
    temperatureF: number | null;
    windSpeed: string | null;
    windDirection: string | null;
    textDescription: string | null;
    relativeHumidity: number | null;
    timestamp: string | null;
  };
  forecast: Array<{
    startTime: string;
    endTime: string;
    temperature: number;
    temperatureUnit: string;
    windSpeed: string;
    windDirection: string;
    shortForecast: string;
    detailedForecast: string;
  }>;
  alerts: Array<{
    id: string;
    event: string;
    severity: Severity;
    headline: string;
    effective: string | null;
    expires: string | null;
    senderName: string | null;
  }>;
  lastSuccessAt: string;
  stale: boolean;
}

export interface NationalReport {
  generatedAt: string;
  stale: boolean;
  lastSuccessAt: string;
  activeAlerts: number;
  severeAlerts: number;
  topEvents: Array<{ event: string; count: number }>;
}

export interface DeltaFeedItem {
  id: string;
  type: "hazard.created" | "hazard.updated" | "hazard.expired" | "observation.updated" | "briefing.updated";
  severity: Severity;
  summary: string;
  routeId: string | null;
  locationKey: string | null;
  occurredAt: string;
  payload: unknown;
}

export interface DispatcherBoard {
  routeId: string;
  origin: string;
  destination: string;
  alternates: string[];
  risk: Severity;
  lastComputedAt: string;
  stations: Array<{
    icao: string;
    label: string;
    weather: {
      temperatureF: number | null;
      visibilityMi: number | null;
      windSpeedKt: number | null;
      ceilingFt: number | null;
      category: "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN";
      observedAt: string;
    } | null;
  }>;
  activeHazards: Array<{
    id: string;
    source: "NWS" | "SIGMET" | "NOTAM" | "TAF" | "METAR";
    title: string;
    severity: Severity;
    effective: string | null;
    expires: string | null;
  }>;
  stale: boolean;
}

export interface OverlayStateInput {
  mapLayerMetar: boolean;
  mapLayerTaf: boolean;
  mapLayerSigmet: boolean;
  mapLayerNotam: boolean;
  mapLayerRadar: boolean;
  mapLayerClouds: boolean;
  mapLayerTemp: boolean;
}

export interface AviationOverlay {
  id: string;
  type: "METAR" | "TAF" | "SIGMET" | "NOTAM";
  title: string;
  severity: Severity;
  latitude: number | null;
  longitude: number | null;
  geometry: GeoJSON.Geometry | null;
  issuedAt: string | null;
  expiresAt: string | null;
  rawText: string;
}

export interface SearchLocationResult {
  id: string;
  displayName: string;
  lat: number;
  lon: number;
  state: string;
}
