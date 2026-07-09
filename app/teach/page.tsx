import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import TeacherApplyForm from "@/components/teach/TeacherApplyForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "en", namespace: "teach" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Public, English, unauthenticated teacher recruitment page. Not behind the /studio·/learn·/guardian
// proxy — a self-service application that creates a RECORD ONLY (see submitTeacherApplication, R1).
export default async function TeachPage() {
  const t = await getTranslations({ locale: "en", namespace: "teach" });
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <main dir="ltr" lang="en" className="flex min-h-screen flex-col bg-cream px-5 py-6">
        <Link href="/" className="self-start text-sm font-semibold text-brand transition-colors hover:text-brand-800">
          {t("backHome")}
        </Link>
        <div className="flex w-full flex-1 items-center justify-center pb-12 pt-2">
          <TeacherApplyForm />
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
