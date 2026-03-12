import type {
  AviationOverlay,
  DeltaFeedItem,
  DispatcherBoard,
  LocationWeather,
  NationalReport,
} from "@/server/types";

export const memory = {
  national: null as NationalReport | null,
  locationByKey: new Map<string, LocationWeather>(),
  overlays: [] as AviationOverlay[],
  deltaFeed: [] as DeltaFeedItem[],
  routeBoards: new Map<string, DispatcherBoard>(),
};

export function toEventId() {
  return crypto.randomUUID();
}
