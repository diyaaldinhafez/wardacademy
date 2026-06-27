import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward Academy — Studio",
  robots: { index: false, follow: false },
};

// Ward identity: Arabic / RTL chrome; English is kept only for the learning
// content itself (items, questions).
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
