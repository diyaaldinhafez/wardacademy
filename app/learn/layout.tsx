import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward Academy — Practice",
  robots: { index: false, follow: false },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {children}
    </div>
  );
}
