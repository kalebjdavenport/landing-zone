"use client";

import { useMemo, useState } from "react";
import { CloudUpload, Loader2, Search } from "lucide-react";

import { GridBackground } from "@/components/magicui/grid-background";
import { DeltaFeedCard } from "@/components/dashboard/delta-feed";
import { LocationWeatherCard } from "@/components/dashboard/location-weather";
import { NationalReportCard } from "@/components/dashboard/national-report";
import { OverlayMapPanel } from "@/components/dashboard/overlay-map-panel";
import { RouteBoardCard } from "@/components/dashboard/route-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeFeed } from "@/hooks/use-realtime-feed";
import { trpc } from "@/lib/trpc/client";

const defaultCenter = {
  lat: 39.8283,
  lon: -98.5795,
};

export function AppDashboard() {
  const [routeId] = useState("default");
  const [searchInput, setSearchInput] = useState("Atlanta, GA");
  const [searchTerm, setSearchTerm] = useState("Atlanta, GA");
  const [selected, setSelected] = useState<{ lat: number; lon: number }>(defaultCenter);
  const utils = trpc.useUtils();

  useRealtimeFeed(routeId);

  const nationalReport = trpc.ops.getNationalReport.useQuery();
  const dispatcherBoard = trpc.ops.getDispatcherBoard.useQuery({ routeId });
  const deltaFeed = trpc.ops.getDeltaFeed.useQuery({});
  const overlays = trpc.ops.getAviationOverlays.useQuery();

  const locationSearch = trpc.ops.searchLocation.useQuery(
    { query: searchTerm },
    {
      enabled: searchTerm.length > 2,
    },
  );

  const locationWeather = trpc.ops.getLocationWeather.useQuery(selected);

  const overlayStateQuery = trpc.prefs.getOverlayState.useQuery();
  const saveOverlayState = trpc.prefs.setOverlayState.useMutation();
  const ingestMutation = trpc.ops.runIngestNow.useMutation();

  const chosenCenter = useMemo(() => {
    return {
      lat: locationWeather.data?.point.lat ?? selected.lat,
      lon: locationWeather.data?.point.lon ?? selected.lon,
    };
  }, [locationWeather.data?.point.lat, locationWeather.data?.point.lon, selected.lat, selected.lon]);

  const overlayState = overlayStateQuery.data ?? {
    mapLayerMetar: true,
    mapLayerTaf: true,
    mapLayerSigmet: true,
    mapLayerNotam: false,
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-100">
      <GridBackground />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Landing Zone</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Dispatcher-focused weather intelligence with NWS as the primary source, enriched by METAR/TAF/SIGMET/NOTAM overlays.
          </p>
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <label htmlFor="search" className="text-sm font-medium text-slate-700">
                    Search US location
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="City, state or lat,lon"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm(searchInput.trim());
                      }}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Find
                    </Button>
                  </div>
                  {locationSearch.data?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {locationSearch.data.map((result) => (
                        <Button
                          key={result.id}
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected({ lat: result.lat, lon: result.lon })}
                        >
                          {result.displayName}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => ingestMutation.mutate({ source: "all" })}
                    disabled={ingestMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {ingestMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CloudUpload className="mr-2 h-4 w-4" />
                    )}
                    Run ingest
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </header>

        {nationalReport.isLoading || !nationalReport.data ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          <NationalReportCard report={nationalReport.data} />
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {dispatcherBoard.data ? <RouteBoardCard board={dispatcherBoard.data} /> : <Skeleton className="h-96 w-full" />}
          <LocationWeatherCard weather={locationWeather.data ?? null} />
        </section>

        <OverlayMapPanel
          overlays={overlays.data ?? []}
          center={chosenCenter}
          state={overlayState}
          onStateChange={(nextState) => {
            utils.prefs.getOverlayState.setData(undefined, nextState);
            saveOverlayState.mutate(nextState, {
              onError: () => {
                void utils.prefs.getOverlayState.invalidate();
              },
            });
          }}
        />

        <DeltaFeedCard items={deltaFeed.data ?? []} />
      </div>
    </main>
  );
}
