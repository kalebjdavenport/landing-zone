import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/utils";

export function getSupabaseServiceClient() {
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL", "");
  const supabaseServiceRole = env("SUPABASE_SERVICE_ROLE_KEY", "");

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
