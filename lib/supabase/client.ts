import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser (Client Components). Uses the public anon
 * key and always operates under the signed-in user's session + RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
