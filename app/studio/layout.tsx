import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward Academy — Studio",
  robots: { index: false, follow: false },
};

// The teacher studio is English by internal decision (forced-`en`, see the
// workspace layout + getTranslations({locale:"en"})). Pin LTR/en here so the
// chrome and alignment stay English-pure regardless of the global LOCALE cookie
// — without this, an `ar` cookie makes the root <html dir="rtl"> bleed in and
// right-align the English UI. Parent surfaces keep their cookie-driven dir.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
