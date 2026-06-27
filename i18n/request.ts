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

export default getRequestConfig(async ({ requestLocale }) => {
  const valid = (v: string | undefined | null): Locale | null =>
    (SUPPORTED_LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : null;
  // Priority: an EXPLICIT requested locale wins — getTranslations({locale:"en"}) on the
  // forced-English surfaces (/studio, /admin, /learn, /video), or the guardian's effective
  // locale — so they render their intended language regardless of the LOCALE cookie. Only
  // when no explicit locale is requested do we fall back to the cookie (parent surfaces),
  // then the default. This is what makes "forced en" actually forced.
  const requested = valid(await requestLocale);
  const cookie = valid((await cookies()).get(LOCALE_COOKIE)?.value);
  const locale: Locale = requested ?? cookie ?? DEFAULT_LOCALE;
  return {
    locale,
    // Data + infra run in EU/Frankfurt; pin the formatting timezone for stable SSR.
    timeZone: "Europe/Berlin",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
