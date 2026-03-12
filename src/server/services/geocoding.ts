import type { SearchLocationResult } from "@/server/types";

const USER_AGENT =
  process.env.NWS_USER_AGENT ?? "LandingZone/1.0 (interview@infotrak.local)";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    state?: string;
  };
}

export async function searchUsLocation(query: string): Promise<SearchLocationResult[]> {
  if (!query.trim()) {
    return [];
  }

  const compact = query.trim();
  const latLon = compact.match(
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  );

  if (latLon) {
    return [
      {
        id: `${latLon[1]},${latLon[2]}`,
        displayName: `Coordinates ${latLon[1]}, ${latLon[2]}`,
        lat: Number(latLon[1]),
        lon: Number(latLon[2]),
        state: "Unknown",
      },
    ];
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=us&limit=6&q=${encodeURIComponent(
      compact,
    )}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
      },
      next: {
        revalidate: 3600,
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  const results = (await response.json()) as NominatimResult[];

  return results.map((item) => ({
    id: String(item.place_id),
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    state: item.address?.state ?? "Unknown",
  }));
}
