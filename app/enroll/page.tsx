/* eslint-disable react-hooks/purity -- server component: date math per request is intentional */
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EnrollFlow from "@/components/enroll/EnrollFlow";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("enrollForm");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function EnrollPage() {
  const locale = await getLocale();
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();

  let slots: { id: string; starts_at: string; duration_minutes: number }[] = [];
  if (tenant) {
    // Visitors see only the next two weeks of openings.
    const twoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const { data } = await admin
      .from("availability_slots")
      .select("id, starts_at, duration_minutes")
      .eq("tenant_id", tenant.id)
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .lt("starts_at", twoWeeks)
      .order("starts_at")
      .limit(40);
    slots = data ?? [];
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="min-h-screen bg-cream">
      <div className="flex justify-end px-5 pt-5">
        <LocaleSwitcher />
      </div>
      <main className="flex items-center justify-center px-5 pb-12 pt-4">
        <EnrollFlow slots={slots} />
      </main>
    </div>
  );
}
