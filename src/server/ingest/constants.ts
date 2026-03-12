export const DEFAULT_SEED_STATIONS = [
  { lat: 33.6367, lon: -84.4281, icao: "KATL", label: "Atlanta" },
  { lat: 40.6413, lon: -73.7781, icao: "KJFK", label: "New York JFK" },
  { lat: 38.8512, lon: -77.0402, icao: "KDCA", label: "Washington DCA" },
] as const;

/** Maximum aviation overlay events to process per ingest cycle */
export const MAX_AVIATION_OVERLAY_EVENTS = 50;

/** Maximum NWS alerts to emit as individual delta events per location */
export const MAX_ALERT_EVENTS_PER_LOCATION = 5;
