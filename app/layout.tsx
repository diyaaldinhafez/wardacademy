import type { Metadata } from "next";
import { Nunito, Baloo_2, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import "./ward.css";

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
  // next-intl is the single i18n system: the active locale (LOCALE cookie,
  // default en) + its messages drive both Server and Client Components. The root
  // html lang/dir follow the locale (English-first → ltr); each surface still
  // owns its own dir container (forced-en on child/studio/admin, locale-driven
  // on the parent-facing surfaces).
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${nunito.variable} ${baloo.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-cream text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
