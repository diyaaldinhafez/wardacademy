/* eslint-disable react-hooks/purity -- server component: date math per request is intentional */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BookFlow from "@/components/enroll/BookFlow";
import FlowerMark from "@/components/FlowerMark";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("enrollForm");
  return { title: t("bookMetaTitle"), robots: { index: false, follow: false } };
}

export default async function BookPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const t = await getTranslations("enrollForm");
  const admin = createAdminClient();

  const { data: lead } = await admin
    .from("leads")
    .select("id, tenant_id, student_name, status")
    .eq("book_token", token)
    .maybeSingle();
  if (!lead) notFound();

  // Already has a booked intro slot?
  const { data: existing } = await admin
    .from("availability_slots")
    .select("starts_at")
    .eq("lead_id", lead.id)
    .eq("status", "booked")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const twoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const { data: slotsData } = await admin
    .from("availability_slots")
    .select("id, starts_at, duration_minutes")
    .eq("tenant_id", lead.tenant_id)
    .eq("status", "open")
    .gte("starts_at", new Date().toISOString())
    .lt("starts_at", twoWeeks)
    .order("starts_at")
    .limit(40);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="flex min-h-screen flex-col items-center bg-cream px-5 py-6">
      <div className="flex w-full max-w-md justify-end">
        <LocaleSwitcher />
      </div>
      <div className="flex w-full flex-1 items-center justify-center pb-12 pt-4">
        {existing ? (
          <div className="mx-auto w-full max-w-md text-center">
            <FlowerMark className="mx-auto h-14 w-14" />
            <h1 className="mt-4 text-2xl font-bold text-ink">{t("alreadyBookedTitle")}</h1>
            <div className="mt-4 rounded-3xl border border-brand-100 bg-white p-6 shadow-ward-1">
              <p className="text-sm text-ink-soft">{t("alreadyBookedNote")}</p>
            </div>
          </div>
        ) : (
          <BookFlow token={token} slots={slotsData ?? []} studentName={lead.student_name ?? t("childFallback")} />
        )}
      </div>
    </main>
  );
}
