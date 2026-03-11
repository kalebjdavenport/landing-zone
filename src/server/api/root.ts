import { createTRPCRouter } from "@/server/api/trpc";
import { opsRouter } from "@/server/api/routers/ops";
import { prefsRouter } from "@/server/api/routers/prefs";

export const appRouter = createTRPCRouter({
  ops: opsRouter,
  prefs: prefsRouter,
});

export type AppRouter = typeof appRouter;
