import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

const overlayStateSchema = z.object({
  mapLayerMetar: z.boolean(),
  mapLayerTaf: z.boolean(),
  mapLayerSigmet: z.boolean(),
  mapLayerNotam: z.boolean(),
});

let overlayState = {
  mapLayerMetar: true,
  mapLayerTaf: true,
  mapLayerSigmet: true,
  mapLayerNotam: false,
};

export const prefsRouter = createTRPCRouter({
  getOverlayState: publicProcedure.query(async () => overlayState),

  setOverlayState: publicProcedure
    .input(overlayStateSchema)
    .mutation(async ({ input }) => {
      overlayState = input;
      return overlayState;
    }),
});
