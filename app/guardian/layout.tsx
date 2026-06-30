import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward Academy — Guardian",
  robots: { index: false, follow: false },
};

// PA-2: the guardian dashboard is Arabic-only. This container OWNS dir="rtl" lang="ar" on its own
// subtree — independent of the root LOCALE cookie (the landing toggle can't flip it). On lang="ar"
// the html[lang="ar"] font override makes the Arabic face primary, so the per-glyph font fix (only
// for the retired English-UI case) is no longer needed. Children inherit.
export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
