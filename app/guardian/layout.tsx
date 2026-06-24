import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Ward Academy — Guardian",
  robots: { index: false, follow: false },
};

// First bilingual surface: direction follows the active locale (English-first,
// flips to RTL for ع). A single container owns the direction — children inherit.
export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
