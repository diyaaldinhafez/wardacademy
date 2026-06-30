import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import arMessages from "@/messages/ar.json";

export const metadata: Metadata = {
  title: "Ward Academy — Set password",
  robots: { index: false, follow: false },
};

// PA-2: /set-password is Arabic-only. A forced-`ar` provider wraps this client page (so its
// useLocale()/useTranslations resolve to Arabic regardless of the root LOCALE cookie), and this
// container OWNS dir="rtl" lang="ar" on its own subtree — the landing toggle's cookie can't flip it.
export default function SetPasswordLayout({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="ar" messages={arMessages}>
      <div dir="rtl" lang="ar" className="min-h-screen bg-cream text-ink">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
