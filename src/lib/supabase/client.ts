"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let connectionVerified = false;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase:browser] Missing env vars — realtime and persistence disabled.",
    );
    return null;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  if (!connectionVerified) {
    verifyBrowserConnection(client);
  }

  return client;
}

async function verifyBrowserConnection(client: SupabaseClient) {
  try {
    const { error } = await client
      .from("event_log")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error("[supabase:browser] Connection FAILED:", error.message);
    } else {
      console.log("[supabase:browser] Connected successfully.");
      connectionVerified = true;
    }
  } catch (e) {
    console.error("[supabase:browser] Connection FAILED:", e);
  }
}
