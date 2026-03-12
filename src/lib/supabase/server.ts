import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/utils";

let connectionVerified = false;

export function getSupabaseServiceClient() {
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL", "");
  const supabaseServiceRole = env("SUPABASE_SERVICE_ROLE_KEY", "");

  if (!supabaseUrl || !supabaseServiceRole) {
    console.warn(
      "[supabase:server] Missing env vars — running without persistence.",
      { url: !!supabaseUrl, serviceRole: !!supabaseServiceRole },
    );
    return null;
  }

  const client = createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  if (!connectionVerified) {
    verifyConnection(client);
  }

  return client;
}

async function verifyConnection(client: SupabaseClient) {
  try {
    const { error } = await client
      .from("event_log")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error("[supabase:server] Connection FAILED:", error.message);
    } else {
      console.log("[supabase:server] Connected successfully.");
      connectionVerified = true;
    }
  } catch (e) {
    console.error("[supabase:server] Connection FAILED:", e);
  }
}
