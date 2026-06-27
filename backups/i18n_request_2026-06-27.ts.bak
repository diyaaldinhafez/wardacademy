import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// English-first, no route prefixes: the active locale lives in the LOCALE cookie
// (set by the LocaleSwitcher on parent surfaces). Default = English. The child
// surface (/learn) stays English regardless. ar.json can be added later with no
// code change — it is loaded here the same way as en.json.
export const SUPPORTED_LOCALES = ["en", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "LOCALE";

export default getRequestConfig(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(cookie ?? "") ? (cookie as Locale) : DEFAULT_LOCALE;
  return {
    locale,
    // Data + infra run in EU/Frankfurt; pin the formatting timezone for stable SSR.
    timeZone: "Europe/Berlin",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
