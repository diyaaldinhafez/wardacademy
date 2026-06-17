import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward Academy — Studio",
  robots: { index: false, follow: false },
};

// The teacher workspace is English / LTR (PRD §7), independent of the marketing
// site's Arabic / RTL shell.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {children}
    </div>
  );
}
