"use client";

import { useEffect, useMemo, useRef } from "react";
import { CloudUpload, Loader2 } from "lucide-react";

import { GridBackground } from "@/components/magicui/grid-background";
import { ArchitectureSimulator } from "@/components/dashboard/architecture-simulator";
import { DeltaFeedCard } from "@/components/dashboard/delta-feed";
import { LocationWeatherCard } from "@/components/dashboard/location-weather";
import { NationalReportCard } from "@/components/dashboard/national-report";
import { OverlayMapPanel } from "@/components/dashboard/overlay-map-panel";
import { RouteBoardCard } from "@/components/dashboard/route-board";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SystemDiagram } from "@/components/dashboard/system-diagram";
import { ViewNav } from "@/components/dashboard/view-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeFeed } from "@/hooks/use-realtime-feed";
import { useUrlSync } from "@/hooks/use-url-sync";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/store/dashboard-store";

export function AppDashboard() {
  const view = useDashboardStore((s) => s.view);
  const setView = useDashboardStore((s) => s.setView);
  const routeId = useDashboardStore((s) => s.routeId);
  const selectedLocation = useDashboardStore((s) => s.selectedLocation);
  const locationLabel = useDashboardStore((s) => s.locationLabel);
  useUrlSync();
  useRealtimeFeed(routeId);

  const nationalReport = trpc.ops.getNationalReport.useQuery();
  const dispatcherBoard = trpc.ops.getDispatcherBoard.useQuery({ routeId });
  const deltaFeed = trpc.ops.getDeltaFeed.useQuery({});
  const overlays = trpc.ops.getAviationOverlays.useQuery(
    selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : undefined,
  );

  const locationWeather = trpc.ops.getLocationWeather.useQuery(
    selectedLocation!,
    { enabled: selectedLocation !== null },
  );

  const utils = trpc.useUtils();
  const ingestMutation = trpc.ops.runIngestNow.useMutation({
    onSuccess: () => utils.ops.invalidate(),
  });

  // Auto-run ingest on first load when the delta feed is empty
  const didAutoIngest = useRef(false);
  useEffect(() => {
    if (
      !didAutoIngest.current &&
      deltaFeed.isFetched &&
      deltaFeed.data?.length === 0 &&
      !ingestMutation.isPending
    ) {
      didAutoIngest.current = true;
      ingestMutation.mutate({ source: "all" });
    }
  }, [deltaFeed.isFetched, deltaFeed.data?.length, ingestMutation]);

  const chosenCenter = useMemo(() => {
    return {
      lat: locationWeather.data?.point.lat ?? selectedLocation?.lat ?? 39.8283,
      lon: locationWeather.data?.point.lon ?? selectedLocation?.lon ?? -98.5795,
    };
  }, [
    locationWeather.data?.point.lat,
    locationWeather.data?.point.lon,
    selectedLocation?.lat,
    selectedLocation?.lon,
  ]);

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

          <SearchBar />

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
                <LocationWeatherCard weather={locationWeather.data ?? null} label={locationLabel} />
                <OverlayMapPanel
                  overlays={overlays.data ?? []}
                  center={chosenCenter}
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
