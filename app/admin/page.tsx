import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
function Kpi({ label, value, tone = "neutral", href }: { label: string; value: number; tone?: any; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Card interactive style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ marginTop: 2 }}><Badge tone={tone}>عرض</Badge></span>
      </Card>
    </Link>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const counts = async (q: any) => (await q).count ?? 0;
  const [newLeads, booked, testing, tested, openSlots, draftTests] = await Promise.all([
    counts(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new")),
    counts(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "booked")),
    counts(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "testing")),
    counts(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "tested")),
    counts(supabase.from("availability_slots").select("id", { count: "exact", head: true }).eq("status", "open")),
    counts(supabase.from("lead_tests").select("id", { count: "exact", head: true }).eq("status", "draft")),
  ]);

  return (
    <>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>نظرةٌ سريعة على قمع التسجيل. اضغط أيّ بطاقةٍ للمتابعة.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        <Kpi label="طلبات جديدة" value={newLeads} tone="apricot" href="/admin/registrations" />
        <Kpi label="حُجِزت جلستها التعريفية" value={booked} tone="brand" href="/admin/registrations" />
        <Kpi label="اختبارٌ بانتظار الاعتماد" value={draftTests} tone="warning" href="/admin/registrations" />
        <Kpi label="قيد الاختبار" value={testing} href="/admin/registrations" />
        <Kpi label="اكتمل الاختبار — جاهزٌ للتجهيز" value={tested} tone="success" href="/admin/registrations" />
        <Kpi label="مواعيد مفتوحة للحجز" value={openSlots} href="/admin/registrations" />
      </div>
    </>
  );
}
