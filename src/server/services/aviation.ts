import { nowIso } from "@/lib/utils";
import { severityFromText } from "@/server/services/severity";
import type { AviationOverlay } from "@/server/types";

interface AviationApiItem {
  icaoId?: string;
  rawOb?: string;
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
      title: "KJFK METAR update",
      severity: "moderate",
      latitude: 40.6398,
      longitude: -73.7789,
      geometry: null,
      issuedAt: current,
      expiresAt: null,
      rawText: "KJFK 111551Z 27019G29KT 3SM RA OVC008 09/07 A2964",
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
  ];
}

export async function fetchAviationOverlays(): Promise<AviationOverlay[]> {
  try {
    const [metarResponse, sigmetResponse] = await Promise.all([
      fetch(`${AWC_BASE}/metar?format=json&taf=false`),
      fetch(`${AWC_BASE}/airsigmet?format=json`),
    ]);

    if (!metarResponse.ok || !sigmetResponse.ok) {
      return fallbackOverlays();
    }

    const metars = (await metarResponse.json()) as AviationApiItem[];
    const sigmets = (await sigmetResponse.json()) as AviationApiItem[];

    const metarOverlays: AviationOverlay[] = metars.slice(0, 120).map((item, index) => ({
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

    const sigmetOverlays: AviationOverlay[] = sigmets.slice(0, 40).map((item, index) => ({
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

    return [...sigmetOverlays, ...metarOverlays];
  } catch {
    return fallbackOverlays();
  }
}
