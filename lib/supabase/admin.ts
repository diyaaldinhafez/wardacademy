import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client — uses the service-role key and BYPASSES RLS.
 * SERVER ONLY (the `server-only` import makes importing this from client code
 * a build error). Use only for trusted server operations (generation service,
 * admin tasks); never expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
