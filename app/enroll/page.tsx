/* eslint-disable react-hooks/purity -- server component: date math per request is intentional */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import arMessages from "@/messages/ar.json";
import { createAdminClient } from "@/lib/supabase/admin";
import EnrollFlow from "@/components/enroll/EnrollFlow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "ar", namespace: "enrollForm" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// PA-2: /enroll is Arabic-only — force ar (NextIntlClientProvider locale="ar" wraps the client
// EnrollFlow) + this subtree OWNS dir="rtl" lang="ar", so the root LOCALE cookie can't flip it.
export default async function EnrollPage() {
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
    <NextIntlClientProvider locale="ar" messages={arMessages}>
      <div dir="rtl" lang="ar" className="min-h-screen bg-cream">
        <main className="flex items-center justify-center px-5 pb-12 pt-4">
          <EnrollFlow slots={slots} />
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
