import { type Airport, US_AIRPORTS } from "@/data/us-airports";

export const MAX_RESULTS = 8;

export function searchAirports(query: string): Airport[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  // Exact ICAO or IATA match first
  const exactIcao = US_AIRPORTS.filter((a) => a.icao.toLowerCase() === q);
  if (exactIcao.length > 0) return exactIcao;
  const exactIata = US_AIRPORTS.filter((a) => a.iata.toLowerCase() === q);
  if (exactIata.length > 0) return exactIata;

  // Prefix match on codes (highest priority)
  const codePrefix = US_AIRPORTS.filter(
    (a) => a.icao.toLowerCase().startsWith(q) || a.iata.toLowerCase().startsWith(q),
  );

  // Contains match on name, city, state
  const textMatch = US_AIRPORTS.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.state.toLowerCase().includes(q),
  );

  // Deduplicate: code matches first, then text matches
  const seen = new Set<string>();
  const results: Airport[] = [];
  for (const a of [...codePrefix, ...textMatch]) {
    if (!seen.has(a.icao)) {
      seen.add(a.icao);
      results.push(a);
    }
    if (results.length >= MAX_RESULTS) break;
  }

  return results;
}
