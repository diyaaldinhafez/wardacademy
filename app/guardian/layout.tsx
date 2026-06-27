import type { Metadata } from "next";
import { guardianEffectiveLocale } from "@/lib/parentLocale";

export const metadata: Metadata = {
  title: "Ward Academy — Guardian",
  robots: { index: false, follow: false },
};

// First bilingual surface: direction follows the EFFECTIVE locale — an explicit
// switcher cookie, else the guardian's saved comms_locale, else 'ar'. A single
// container owns the direction — children inherit.
export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const locale = await guardianEffectiveLocale();
  // Arabic-font routing for the English-UI case (parent locale=en). The global
  // --font-sans starts with Nunito, and next/font's "Nunito Fallback" (= local
  // Arial, no unicode-range) catches Arabic glyphs before the Ward Arabic face —
  // so plain body text here (child name, parent-language report content, skill
  // labels) lost Plex Arabic. Pin a per-glyph stack: the REAL "Nunito" face (its
  // unicode-range excludes Arabic) then straight to the Arabic face — Latin glyphs
  // stay Nunito (unchanged, no shape shift), Arabic glyphs resolve to IBM Plex Sans
  // Arabic, with no Arial in between. On locale=ar the html[lang="ar"] override
  // already makes the Arabic face primary, so we leave that path untouched.
  const fontFix = locale === "ar" ? undefined : { fontFamily: '"Nunito", var(--font-ar), system-ui, sans-serif' };
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} style={fontFix} className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
