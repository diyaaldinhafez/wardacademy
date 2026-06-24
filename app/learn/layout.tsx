import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";

export const metadata: Metadata = {
  title: "Ward Academy — Practice",
  robots: { index: false, follow: false },
};

// The child surface is English-pure: LTR/en, and a forced-`en` provider so its
// client components (e.g. the shared WorkspaceHeader) ignore the global cookie.
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <div dir="ltr" lang="en" className="min-h-screen bg-cream text-ink">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
