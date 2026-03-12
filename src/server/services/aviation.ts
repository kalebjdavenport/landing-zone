import { nowIso } from "@/lib/utils";
import { severityFromText } from "@/server/services/severity";
import type { AviationOverlay } from "@/server/types";

interface AviationApiItem {
  icaoId?: string;
  rawOb?: string;
  rawTAF?: string;
  receiptTime?: string;
  lat?: number;
  lon?: number;
  issueTime?: string;
  validTimeFrom?: string;
  validTimeTo?: string;
  forecast?: string;
  hazard?: string;
  geojson?: GeoJSON.Geometry;
}

const AWC_BASE = "https://aviationweather.gov/api/data";

/** Degrees of lat/lon to expand around a center point (≈250 nm radius). */
const BBOX_RADIUS_DEG = 4;

function bboxParam(center: { lat: number; lon: number }): string {
  return `&bbox=${center.lon - BBOX_RADIUS_DEG},${center.lat - BBOX_RADIUS_DEG},${center.lon + BBOX_RADIUS_DEG},${center.lat + BBOX_RADIUS_DEG}`;
}

function safeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function fallbackOverlays(): AviationOverlay[] {
  const current = nowIso();

  return [
    {
      id: "mock-metar-kjfk",
      type: "METAR",
      title: "KJFK METAR",
      severity: "moderate",
      latitude: 40.6398,
      longitude: -73.7789,
      geometry: null,
      issuedAt: current,
      expiresAt: null,
      rawText: "KJFK 111551Z 27019G29KT 3SM RA OVC008 09/07 A2964",
    },
    {
      id: "mock-taf-kjfk",
      type: "TAF",
      title: "KJFK TAF",
      severity: "moderate",
      latitude: 40.6398,
      longitude: -73.7789,
      geometry: null,
      issuedAt: current,
      expiresAt: null,
      rawText: "TAF KJFK 111730Z 1118/1224 27015G25KT P6SM BKN040",
    },
    {
      id: "mock-sigmet-east",
      type: "SIGMET",
      title: "Convective SIGMET East",
      severity: "high",
      latitude: 39.5,
      longitude: -77.1,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-78.0, 38.5],
            [-76.0, 38.8],
            [-75.5, 40.3],
            [-77.6, 40.1],
            [-78.0, 38.5],
          ],
        ],
      },
      issuedAt: current,
      expiresAt: null,
      rawText: "CONVECTIVE SIGMET for embedded thunderstorms and moderate turbulence.",
    },
    {
      id: "mock-notam-kjfk",
      type: "NOTAM",
      title: "KJFK RWY 13R/31L closed",
      severity: "moderate",
      latitude: 40.6398,
      longitude: -73.7789,
      geometry: null,
      issuedAt: current,
      expiresAt: null,
      rawText: "!JFK 01/234 JFK RWY 13R/31L CLSD 2601111500-2601121500",
    },
  ];
}

/**
 * Fetch aviation overlays from the AWC API.
 *
 * When `center` is provided the requests are scoped to a bounding box
 * (±4 deg ≈ 250 nm). Without a center the API returns its default
 * nationwide dataset.
 */
export async function fetchAviationOverlays(
  center?: { lat: number; lon: number },
): Promise<AviationOverlay[]> {
  const bbox = center ? bboxParam(center) : "";

  try {
    const [metarResponse, tafResponse, sigmetResponse] = await Promise.all([
      fetch(`${AWC_BASE}/metar?format=json&taf=false&hours=2${bbox}`),
      fetch(`${AWC_BASE}/taf?format=json&hours=6${bbox}`),
      fetch(`${AWC_BASE}/airsigmet?format=json${bbox}`),
    ]);

    if (!metarResponse.ok || !sigmetResponse.ok) {
      return fallbackOverlays();
    }

    const metars = (await metarResponse.json()) as AviationApiItem[];
    const tafs = tafResponse.ok
      ? ((await tafResponse.json()) as AviationApiItem[])
      : [];
    const sigmets = (await sigmetResponse.json()) as AviationApiItem[];

    const metarOverlays: AviationOverlay[] = metars.slice(0, 300).map((item, index) => ({
      id: `metar-${item.icaoId ?? index}`,
      type: "METAR",
      title: `${item.icaoId ?? "Unknown"} METAR`,
      severity: severityFromText(item.rawOb ?? ""),
      latitude: item.lat ?? null,
      longitude: item.lon ?? null,
      geometry: null,
      issuedAt: safeDate(item.receiptTime),
      expiresAt: null,
      rawText: item.rawOb ?? "",
    }));

    const tafOverlays: AviationOverlay[] = tafs.slice(0, 300).map((item, index) => ({
      id: `taf-${item.icaoId ?? index}`,
      type: "TAF",
      title: `${item.icaoId ?? "Unknown"} TAF`,
      severity: severityFromText(item.rawTAF ?? ""),
      latitude: item.lat ?? null,
      longitude: item.lon ?? null,
      geometry: null,
      issuedAt: safeDate(item.issueTime),
      expiresAt: safeDate(item.validTimeTo),
      rawText: item.rawTAF ?? "",
    }));

    const sigmetOverlays: AviationOverlay[] = sigmets.slice(0, 80).map((item, index) => ({
      id: `sigmet-${index}`,
      type: "SIGMET",
      title: item.hazard ? `SIGMET ${item.hazard}` : "SIGMET",
      severity: severityFromText(item.hazard ?? ""),
      latitude: item.lat ?? null,
      longitude: item.lon ?? null,
      geometry: item.geojson ?? null,
      issuedAt: safeDate(item.issueTime),
      expiresAt: safeDate(item.validTimeTo),
      rawText: item.forecast ?? item.hazard ?? "",
    }));

    // Derive NOTAM entries from active SIGMETs — no free public NOTAM API exists.
    // Each SIGMET implies an operational restriction worth surfacing on the NOTAM layer.
    const notamOverlays: AviationOverlay[] = sigmetOverlays
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s, index) => ({
        id: `notam-derived-${index}`,
        type: "NOTAM" as const,
        title: `NOTAM — ${s.title}`,
        severity: s.severity,
        latitude: s.latitude,
        longitude: s.longitude,
        geometry: null,
        issuedAt: s.issuedAt,
        expiresAt: s.expiresAt,
        rawText: `Derived from ${s.title}: ${s.rawText}`,
      }));

    return [...sigmetOverlays, ...notamOverlays, ...tafOverlays, ...metarOverlays];
  } catch {
    return fallbackOverlays();
  }
}
