"use client";

import { useMemo } from "react";
import {
  ActivitySquare,
  AlertTriangle,
  Clock3,
  CloudLightning,
  Loader2,
  MapPin,
  Plane,
  Radio,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { severityBadgeVariant } from "@/components/dashboard/severity";
import { AnimatedList } from "@/components/magicui/animated-list";
import { ShineBorder } from "@/components/magicui/shine-border";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import type { DeltaFeedItem, Severity } from "@/server/types";

const MAX_ITEMS = 10;

const SEVERITY_RANK: Record<Severity, number> = {
  extreme: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

const TYPE_LABELS: Record<DeltaFeedItem["type"], string> = {
  "hazard.created": "New Hazard",
  "hazard.updated": "Hazard Update",
  "hazard.expired": "Hazard Expired",
  "observation.updated": "Observation",
  "briefing.updated": "Briefing",
};

function typeIcon(type: DeltaFeedItem["type"]) {
  switch (type) {
    case "hazard.created":
    case "hazard.updated":
      return <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />;
    case "hazard.expired":
      return <CloudLightning aria-hidden="true" className="h-3.5 w-3.5" />;
    case "observation.updated":
      return <Radio aria-hidden="true" className="h-3.5 w-3.5" />;
    case "briefing.updated":
      return <Plane aria-hidden="true" className="h-3.5 w-3.5" />;
  }
}

function formatLocation(key: string | null): string | null {
  if (!key) return null;
  // locationKey is "lat,lon" — display as coords if nothing better
  const parts = key.split(",");
  if (parts.length === 2) {
    return `${parseFloat(parts[0]).toFixed(2)}°, ${parseFloat(parts[1]).toFixed(2)}°`;
  }
  return key;
}

/** Sort by severity (extreme first), then by recency within each tier. */
function prioritize(items: DeltaFeedItem[]): DeltaFeedItem[] {
  return [...items].sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });
}

export function DeltaFeedCard({ items }: { items: DeltaFeedItem[] }) {
  const prioritized = useMemo(() => prioritize(items).slice(0, MAX_ITEMS), [items]);

  const utils = trpc.useUtils();
  const ingest = trpc.ops.runIngestNow.useMutation({
    onSuccess: () => utils.ops.invalidate(),
  });

  return (
    <Card className="relative overflow-hidden">
      <ShineBorder />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="inline-flex items-center gap-2">
            <ActivitySquare aria-hidden="true" className="h-4 w-4" />
            Delta Feed
          </CardTitle>
          <button
            type="button"
            aria-label="Refresh weather data"
            onClick={() => ingest.mutate({ source: "all" })}
            disabled={ingest.isPending}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
          >
            {ingest.isPending ? (
              <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-3 w-3" />
            )}
            {ingest.isPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Top {MAX_ITEMS} weather changes by severity, then recency.
        </p>
      </CardHeader>
      <CardContent>
        <div role="log" aria-label="Real-time weather changes" aria-live="polite">
          {prioritized.length ? (
            <AnimatedList
              items={prioritized}
              getKey={(item) => item.id}
              renderItem={(item) => (
                <article aria-label={`${TYPE_LABELS[item.type]}: ${item.summary}`} className="rounded-lg border border-slate-200 bg-white/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={severityBadgeVariant(item.severity)}>
                        <span className="inline-flex items-center gap-1">
                          {typeIcon(item.type)}
                          {TYPE_LABELS[item.type]}
                        </span>
                      </Badge>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 aria-hidden="true" className="h-3 w-3" />
                      <time dateTime={item.occurredAt}>
                        {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
                      </time>
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">{item.summary}</p>
                  {item.locationKey && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                      <MapPin aria-hidden="true" className="h-3 w-3" />
                      {formatLocation(item.locationKey)}
                    </span>
                  )}
                </article>
              )}
            />
          ) : (
            <p className="text-sm text-slate-600">
              No recent changes. Ingest will run automatically to populate this feed.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
