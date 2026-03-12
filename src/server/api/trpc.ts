import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

export interface TrpcContext {
  supabase: ReturnType<typeof getSupabaseServiceClient> | null;
}

export function createContext(): TrpcContext {
  try {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      console.warn("[trpc] Supabase unavailable — using in-memory fallback.");
    }
    return { supabase };
  } catch (e) {
    console.error("[trpc] Failed to create Supabase client:", e);
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
