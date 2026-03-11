"use client";

import { ActivitySquare, Clock3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { severityBadgeVariant } from "@/components/dashboard/severity";
import { AnimatedList } from "@/components/magicui/animated-list";
import { ShineBorder } from "@/components/magicui/shine-border";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeltaFeedItem } from "@/server/types";

export function DeltaFeedCard({ items }: { items: DeltaFeedItem[] }) {
  return (
    <Card className="relative overflow-hidden">
      <ShineBorder />
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <ActivitySquare className="h-4 w-4" />
          Delta Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <AnimatedList
            items={items.slice(0, 30)}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <article className="rounded-lg border border-slate-200 bg-white/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={severityBadgeVariant(item.severity)}>{item.type}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.summary}</p>
              </article>
            )}
          />
        ) : (
          <p className="text-sm text-slate-600">No recent deltas yet. Trigger ingest to populate updates.</p>
        )}
      </CardContent>
    </Card>
  );
}
