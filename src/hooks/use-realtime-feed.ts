"use client";

import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";

export function useRealtimeFeed(routeId: string) {
  const utils = trpc.useUtils();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`route:${routeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_log",
        },
        () => {
          void utils.ops.getDeltaFeed.invalidate();
          void utils.ops.getNationalReport.invalidate();
          void utils.ops.getDispatcherBoard.invalidate({ routeId });
          void utils.ops.getAviationOverlays.invalidate();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [routeId, utils]);
}
