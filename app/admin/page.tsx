/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity -- server component: per-request date math is intentional */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";
import { PIPELINE_STEPS, computePipeline } from "@/lib/leads";

const DAY = 24 * 3600 * 1000;
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 14 } as const;

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: leads }, { data: slots }, { data: tests }, { data: intros }, { data: tenant }] = await Promise.all([
    supabase.from("leads").select("id, student_name, status, payment_status, created_at"),
    supabase.from("availability_slots").select("lead_id, starts_at, status"),
    supabase.from("lead_tests").select("lead_id, status"),
    supabase.from("intro_reports").select("lead_id, status"),
    supabase.from("tenants").select("timezone").maybeSingle(),
  ]);
  const tz = tenant?.timezone ?? "Asia/Riyadh";

  const bookedByLead = new Map<string, string>();
  for (const s of (slots ?? []) as any[]) if (s.lead_id && s.status === "booked") bookedByLead.set(s.lead_id, s.starts_at);
  const testByLead = new Map<string, string>();
  for (const t of (tests ?? []) as any[]) if (!testByLead.has(t.lead_id)) testByLead.set(t.lead_id, t.status);
  const introByLead = new Map<string, string>();
  for (const r of (intros ?? []) as any[]) introByLead.set(r.lead_id, r.status);
  const nameByLead = new Map<string, string>();

  const now = Date.now();
  const all = (leads ?? []) as any[];
  for (const l of all) nameByLead.set(l.id, l.student_name ?? "طالب");

  // Per-lead pipeline position.
  const pos = all.map((l) => ({
    lead: l,
    ci: computePipeline({
      hasBooking: bookedByLead.has(l.id),
      testStatus: testByLead.get(l.id),
      introStatus: introByLead.get(l.id),
      paymentStatus: l.payment_status,
      converted: l.status === "converted",
    }).currentIndex,
  }));

  // Funnel: how many leads reached each stage (i <= currentIndex).
  const reached = PIPELINE_STEPS.map((_, i) => pos.filter((p) => p.ci >= i).length);
  const total = all.length || 1;
  const converted = pos.filter((p) => p.ci >= PIPELINE_STEPS.length).length;

  // Action queue.
  const testsToApprove = ((tests ?? []) as any[]).filter((t) => t.status === "draft").length;
  const reportsToSend = ((intros ?? []) as any[]).filter((r) => r.status === "draft").length;
  const toProvision = pos.filter((p) => p.ci === 5).length;
  const staleNoBooking = pos.filter((p) => p.ci === 1 && now - new Date(p.lead.created_at).getTime() > 2 * DAY).length;

  // Upcoming intro sessions (platform tz).
  const fmtWhen = (iso: string) =>
    new Intl.DateTimeFormat("ar", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const upcoming = ((slots ?? []) as any[])
    .filter((s) => s.status === "booked" && s.lead_id && new Date(s.starts_at).getTime() >= now)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 6);

  // Headline metrics.
  const newThisWeek = all.filter((l) => now - new Date(l.created_at).getTime() <= 7 * DAY).length;
  const newPrevWeek = all.filter((l) => {
    const age = now - new Date(l.created_at).getTime();
    return age > 7 * DAY && age <= 14 * DAY;
  }).length;
  const convRate = Math.round((converted / total) * 100);
  const horizon = now + 14 * DAY;
  const inSoon = (s: any) => {
    const t = new Date(s.starts_at).getTime();
    return t >= now && t < horizon;
  };
  const openSoon = ((slots ?? []) as any[]).filter((s) => s.status === "open" && inSoon(s)).length;
  const bookedSoon = ((slots ?? []) as any[]).filter((s) => s.status === "booked" && inSoon(s)).length;

  const trend = newThisWeek - newPrevWeek;
  const trendStr = trend > 0 ? `▲ ${trend}` : trend < 0 ? `▼ ${Math.abs(trend)}` : "—";
  const trendTone = trend > 0 ? "var(--leaf-700)" : trend < 0 ? "var(--rose-700)" : "var(--text-muted)";

  const queue = [
    { label: "اختبارات بانتظار الاعتماد", n: testsToApprove, href: "/admin/registrations?status=testing", tone: "warning" as const },
    { label: "تقارير جاهزة للإرسال", n: reportsToSend, href: "/admin/registrations", tone: "warning" as const },
    { label: "حسابات جاهزة للتجهيز", n: toProvision, href: "/admin/registrations?status=tested", tone: "success" as const },
    { label: "طلبات بلا حجزٍ منذ يومين+", n: staleNoBooking, href: "/admin/registrations?status=new", tone: "apricot" as const },
  ];

  return (
    <>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>نظرةٌ تشغيليّةٌ على قمع التسجيل — الأوقات بتوقيت {tz}.</p>

      {/* Headline metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: "var(--text-strong)" }}>{newThisWeek}</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            طلباتٌ جديدة هذا الأسبوع <span style={{ color: trendTone, fontWeight: 700 }}>{trendStr}</span>
          </span>
        </Card>
        <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: "var(--text-strong)" }}>{convRate}%</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>معدّل التحويل ({converted} من {total})</span>
        </Card>
        <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: "var(--text-strong)" }}>{openSoon}<span style={{ fontSize: 16, color: "var(--text-muted)" }}> / {bookedSoon}</span></span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>السعة (مفتوح / محجوز · أسبوعان)</span>
        </Card>
      </div>

      {/* Funnel + action queue */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
        <Card>
          <div style={secTitle}>قمع التسجيل</div>
          <Link href="/admin/registrations" style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none" }}>
            {PIPELINE_STEPS.map((s, i) => {
              const n = reached[i];
              const pct = Math.round((n / total) * 100);
              return (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 56, fontSize: 13, color: "var(--text-body)", flexShrink: 0 }}>{s.label}</span>
                  <div style={{ flex: 1, height: 22, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(pct, n > 0 ? 6 : 0)}%`, height: "100%", borderRadius: 999, background: "var(--grad-bloom)" }} />
                  </div>
                  <span style={{ width: 28, textAlign: "start", fontSize: 13, fontWeight: 700, color: "var(--text-strong)", flexShrink: 0 }}>{n}</span>
                </div>
              );
            })}
          </Link>
        </Card>

        <Card>
          <div style={secTitle}>يحتاج إجراءً الآن</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  textDecoration: "none",
                  border: "1px solid var(--border-soft)",
                  background: q.n > 0 ? "var(--surface-card)" : "var(--surface-page)",
                  opacity: q.n > 0 ? 1 : 0.6,
                }}
              >
                <Badge tone={q.n > 0 ? q.tone : "neutral"}>{q.n}</Badge>
                <span style={{ flex: 1, fontSize: 13.5, color: "var(--text-body)" }}>{q.label}</span>
                {q.n > 0 && <span style={{ fontSize: 13, color: "var(--text-brand)", fontWeight: 600 }}>افعل ←</span>}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming intro sessions */}
      <Card>
        <div style={secTitle}>جلسات تعريفية قادمة</div>
        {upcoming.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسات قادمة.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {upcoming.map((s, i) => (
              <div
                key={s.lead_id + s.starts_at}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i === upcoming.length - 1 ? "none" : "1px solid var(--ink-100)" }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--leaf-700)", minWidth: 150, flexShrink: 0 }}>{fmtWhen(s.starts_at)}</span>
                <Link href={`/admin/registrations/${s.lead_id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)", textDecoration: "none" }}>
                  {nameByLead.get(s.lead_id) ?? "طالب"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
