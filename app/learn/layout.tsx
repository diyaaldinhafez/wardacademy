import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward Academy — Practice",
  robots: { index: false, follow: false },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
