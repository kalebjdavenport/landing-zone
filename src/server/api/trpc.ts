import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

export interface TrpcContext {
  supabase: ReturnType<typeof getSupabaseServiceClient> | null;
}

export function createContext(): TrpcContext {
  try {
    return { supabase: getSupabaseServiceClient() };
  } catch {
    return { supabase: null };
  }
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export function requireSupabase(ctx: TrpcContext) {
  if (!ctx.supabase) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Supabase is not configured. Check environment variables.",
    });
  }

  return ctx.supabase;
}
