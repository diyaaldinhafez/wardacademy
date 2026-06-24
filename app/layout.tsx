import type { Metadata } from "next";
import { Nunito, Baloo_2, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import "./ward.css";
import LanguageProvider from "@/components/LanguageProvider";

// English body — Nunito (clean, friendly)
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

// English display — Baloo 2 (round, confident)
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Arabic UI (display + body) — IBM Plex Sans Arabic
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ar",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://ward.academy";
const TITLE = "Ward Academy — Confident English, teacher-led & AI-supported";
const DESCRIPTION =
  "Ward Academy helps young learners (ages 9–13) grow confident in English with live 1:1 sessions led by a dedicated teacher who plans every lesson and follows their progress. Book a free trial.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Ward Academy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next-intl: the active locale (LOCALE cookie, default en) + its messages, so
  // Server AND Client Components can translate. Additive — the html lang/dir and
  // the legacy LanguageProvider are unchanged here; per-surface migration takes
  // over dir as each surface moves to next-intl.
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    // Arabic is the default; LanguageProvider updates lang/dir at runtime.
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${nunito.variable} ${baloo.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-cream text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LanguageProvider>{children}</LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
