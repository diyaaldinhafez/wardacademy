import { type Locale } from "@/i18n/request";

/**
 * Effective locale for the guardian surface. PA-2: the guardian dashboard — like every
 * parent-facing surface after the landing — is **Arabic-only**, so this ALWAYS returns "ar".
 * It no longer reads the LOCALE cookie or profiles.comms_locale, so the landing toggle's cookie
 * (or a stale "en" cookie) can never flip the guardian surface to English. (Kept async + this
 * helper so callers/imports are unchanged; profiles.comms_locale stays in the DB as vestigial,
 * retired in PA-4.)
 */
export async function guardianEffectiveLocale(): Promise<Locale> {
  return "ar";
}
