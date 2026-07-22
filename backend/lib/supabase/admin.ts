import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/** Service-role client — bypasses RLS entirely. Server-only: never import
 * this from a Client Component or expose the key to the browser. Reserved
 * for the public lead-intake endpoint and admin user-provisioning. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
