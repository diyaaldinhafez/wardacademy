/* eslint-disable react-hooks/purity -- server component: date math per request is intentional */
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import EnrollFlow from "@/components/enroll/EnrollFlow";

export const metadata: Metadata = {
  title: "سجّل طفلك — أكاديمية وَرد",
  robots: { index: false, follow: false },
};

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
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <EnrollFlow slots={slots} />
    </main>
  );
}
