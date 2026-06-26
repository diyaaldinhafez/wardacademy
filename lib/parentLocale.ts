import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, type Locale } from "@/i18n/request";

/**
 * Effective locale for the guardian surface. Priority:
 *   1) an explicit LOCALE cookie (the manual switcher) — wins,
 *   2) the guardian's saved preference profiles.comms_locale,
 *   3) 'ar' (our audience is Arabic-first).
 * So a parent whose comms_locale='ar' opens straight into Arabic with no cookie,
 * yet a deliberate flip of the switcher still takes precedence.
 */
export async function guardianEffectiveLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookie === "en" || cookie === "ar") return cookie;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "ar";
  const { data } = await supabase.from("profiles").select("comms_locale").eq("id", user.id).maybeSingle();
  return data?.comms_locale === "en" || data?.comms_locale === "ar" ? data.comms_locale : "ar";
}
