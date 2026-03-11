"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, Loader2, MapPin, Search } from "lucide-react";

import { GridBackground } from "@/components/magicui/grid-background";
import { ArchitectureSimulator } from "@/components/dashboard/architecture-simulator";
import { DeltaFeedCard } from "@/components/dashboard/delta-feed";
import { LocationWeatherCard } from "@/components/dashboard/location-weather";
import { NationalReportCard } from "@/components/dashboard/national-report";
import { OverlayMapPanel } from "@/components/dashboard/overlay-map-panel";
import { RouteBoardCard } from "@/components/dashboard/route-board";
import { SystemDiagram } from "@/components/dashboard/system-diagram";
import { type DashboardView, ViewNav } from "@/components/dashboard/view-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeFeed } from "@/hooks/use-realtime-feed";
import { trpc } from "@/lib/trpc/client";

const defaultCenter = {
  lat: 39.8283,
  lon: -98.5795,
};

export function AppDashboard() {
  const [view, setView] = useState<DashboardView>("operations");
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

  const searchRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-100">
      <GridBackground />

      {/* ── Top nav bar ── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200/60 bg-slate-800/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 md:px-6">
          {/* Brand */}
          <div className="shrink-0">
            <h1 className="text-lg font-bold tracking-tight text-white">Landing&nbsp;Zone</h1>
          </div>

          {/* Search bar — Amazon-style attached input + button */}
          <div ref={searchRef} className="relative flex flex-1 max-w-2xl">
            <div className="flex items-center whitespace-nowrap rounded-l-md bg-slate-600/80 px-3 text-xs font-medium text-slate-300 select-none">
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">US Location</span>
            </div>
            <input
              id="search"
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchTerm(searchInput.trim());
                  setSearchOpen(true);
                }
              }}
              placeholder="City, state or lat,lon …"
              className="h-10 w-full border-0 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm(searchInput.trim());
                setSearchOpen(true);
              }}
              className="flex cursor-pointer items-center rounded-r-md bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Dropdown results */}
            {searchOpen && locationSearch.data && locationSearch.data.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                {locationSearch.data.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      onClick={() => {
                        setSelected({ lat: result.lat, lon: result.lon });
                        setSearchInput(result.displayName);
                        setSearchOpen(false);
                      }}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {result.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <Button
            size="sm"
            onClick={() => ingestMutation.mutate({ source: "all" })}
            disabled={ingestMutation.isPending}
            className="shrink-0 bg-cyan-600 text-white hover:bg-cyan-500"
          >
            {ingestMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-1.5 h-4 w-4" />
            )}
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>
        </div>

        {/* View tabs — second row inside nav */}
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <ViewNav value={view} onChange={setView} />
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">

        {view === "operations" ? (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">National Overview</h2>
              {nationalReport.isLoading || !nationalReport.data ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <NationalReportCard report={nationalReport.data} />
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Route Board</h2>
              {dispatcherBoard.data ? (
                <RouteBoardCard board={dispatcherBoard.data} />
              ) : (
                <Skeleton className="h-96 w-full" />
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Location Details</h2>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <LocationWeatherCard weather={locationWeather.data ?? null} />
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
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Live Changes</h2>
              <DeltaFeedCard items={deltaFeed.data ?? []} />
            </section>
          </>
        ) : (
          <section className="space-y-4">
            <SystemDiagram />
            <ArchitectureSimulator />
          </section>
        )}
      </div>
    </main>
  );
}
