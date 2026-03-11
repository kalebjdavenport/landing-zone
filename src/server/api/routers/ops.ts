import { z } from "zod";

import { publicProcedure, createTRPCRouter } from "@/server/api/trpc";
import { runAviationIngest, runNwsIngest } from "@/server/ingest/pipeline";
import {
  getDeltaFeed,
  getDispatcherBoard,
  getLocationWeather,
  getNationalReport,
  listAviationOverlays,
  upsertLocationWeather,
  upsertNationalReport,
} from "@/server/repositories/weather-repo";
import {
  fetchLocationWeatherFromNws,
  fetchNationalReportFromNws,
  searchUsLocation,
} from "@/server/services/nws";

export const opsRouter = createTRPCRouter({
  getNationalReport: publicProcedure.query(async ({ ctx }) => {
    const cached = await getNationalReport(ctx.supabase);
    if (cached && !cached.stale) {
      return cached;
    }

    const fresh = await fetchNationalReportFromNws();
    await upsertNationalReport(ctx.supabase, fresh);

    return fresh;
  }),

  searchLocation: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(120),
      }),
    )
    .query(async ({ input }) => {
      return searchUsLocation(input.query);
    }),

  getLocationWeather: publicProcedure
    .input(
      z.object({
        lat: z.number().gte(18).lte(72),
        lon: z.number().gte(-170).lte(-60),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cached = await getLocationWeather(ctx.supabase, input.lat, input.lon);
      if (cached && !cached.stale) {
        return cached;
      }

      const fresh = await fetchLocationWeatherFromNws(input.lat, input.lon);
      await upsertLocationWeather(ctx.supabase, fresh);

      return fresh;
    }),

  getDispatcherBoard: publicProcedure
    .input(
      z.object({
        routeId: z.string().min(1).max(50).default("default"),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getDispatcherBoard(ctx.supabase, input.routeId);
    }),

  getDeltaFeed: publicProcedure
    .input(
      z.object({
        since: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getDeltaFeed(ctx.supabase, input.since);
    }),

  getAviationOverlays: publicProcedure.query(async ({ ctx }) => {
    return listAviationOverlays(ctx.supabase);
  }),

  runIngestNow: publicProcedure
    .input(
      z.object({
        source: z.enum(["nws", "aviation", "all"]).default("all"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.source === "nws") {
        return {
          nws: await runNwsIngest(ctx),
          aviation: null,
        };
      }

      if (input.source === "aviation") {
        return {
          nws: null,
          aviation: await runAviationIngest(ctx),
        };
      }

      const [nws, aviation] = await Promise.all([runNwsIngest(ctx), runAviationIngest(ctx)]);

      return {
        nws,
        aviation,
      };
    }),
});
