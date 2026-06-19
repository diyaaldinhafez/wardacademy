/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEnrollment, updateEnrollment, generateMonthlyInvoice, setInvoiceStatus } from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import { Card, Badge, Avatar } from "@/components/ward/ui";

const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const ctl = "ward-field__control";
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 12 } as const;
const flabel = { fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 } as const;
const ENR_AR: Record<string, string> = { active: "نشط", paused: "مُعلَّق", cancelled: "مُنتهٍ" };
const ENR_TONE: Record<string, any> = { active: "success", paused: "warning", cancelled: "neutral" };

export default async function StudentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: learner } = await supabase.from("profiles").select("id, full_name, roles").eq("id", id).maybeSingle();
  if (!learner) notFound();

  const { data: tenant } = await supabase.from("tenants").select("currency").maybeSingle();
  const currency = tenant?.currency ?? "SAR";

  const { data: enr } = await supabase
    .from("enrollments")
    .select("id, status, monthly_fee, sessions_per_month, start_date")
    .eq("learner_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, period, amount, status, due_date, paid_at")
    .eq("learner_id", id)
    .order("period", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <Link href="/admin/students" className={btn("ghost")} style={{ alignSelf: "flex-start" }}>→ كلّ الطلاب</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={learner.full_name ?? "?"} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{learner.full_name ?? learner.id}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>إدارة الاشتراك والدفعات</div>
        </div>
        {enr && <Badge tone={ENR_TONE[enr.status] ?? "neutral"}>{ENR_AR[enr.status] ?? enr.status}</Badge>}
      </div>

      {/* Enrollment / plan */}
      {!enr ? (
        <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={secTitle}>إنشاء اشتراك شهريّ</div>
          <form action={createEnrollment} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
            <input type="hidden" name="learnerId" value={id} />
            <div>
              <label style={flabel}>الرسوم الشهرية ({currency})</label>
              <input name="monthlyFee" type="number" min="0" required className={ctl} style={{ width: 140 }} placeholder="مثال: 600" />
            </div>
            <div>
              <label style={flabel}>عدد الجلسات/الشهر (اختياري)</label>
              <input name="sessionsPerMonth" type="number" min="1" className={ctl} style={{ width: 140 }} placeholder="مثال: 8" />
            </div>
            <SubmitButton pendingText="…" className={btn("success", "md")}>ابدأ الاشتراك</SubmitButton>
          </form>
        </Card>
      ) : (
        <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={secTitle}>الخطّة</div>
          <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>
            {enr.monthly_fee} {currency} شهرياً{enr.sessions_per_month ? ` · ${enr.sessions_per_month} جلسة/شهر` : ""} · منذ {enr.start_date}
          </p>
          <form action={updateEnrollment} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
            <input type="hidden" name="enrollmentId" value={enr.id} />
            <input type="hidden" name="learnerId" value={id} />
            <div>
              <label style={flabel}>الرسوم الشهرية ({currency})</label>
              <input name="monthlyFee" type="number" min="0" defaultValue={enr.monthly_fee} required className={ctl} style={{ width: 140 }} />
            </div>
            <div>
              <label style={flabel}>الجلسات/الشهر</label>
              <input name="sessionsPerMonth" type="number" min="1" defaultValue={enr.sessions_per_month ?? ""} className={ctl} style={{ width: 140 }} />
            </div>
            <SubmitButton pendingText="…" className={btn("secondary", "md")}>احفظ الخطّة</SubmitButton>
          </form>
        </Card>
      )}

      {/* Invoices */}
      {enr && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ ...secTitle, marginBottom: 0, flex: 1 }}>الفواتير الشهرية</div>
            <form action={generateMonthlyInvoice}>
              <input type="hidden" name="enrollmentId" value={enr.id} />
              <input type="hidden" name="learnerId" value={id} />
              <SubmitButton pendingText="…" className={btn("soft")}>ولّد فاتورة هذا الشهر</SubmitButton>
            </form>
          </div>
          {(invoices ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا فواتير بعد.</p>}
          {(invoices ?? []).map((inv: any) => {
            const overdue = inv.status === "pending" && inv.due_date && inv.due_date < today;
            const tone = inv.status === "paid" ? "success" : overdue ? "danger" : inv.status === "void" ? "neutral" : "warning";
            const label = inv.status === "paid" ? "مدفوعة" : overdue ? "متأخّرة" : inv.status === "void" ? "ملغاة" : "بانتظار";
            return (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
                <span style={{ fontWeight: 700, color: "var(--text-strong)", minWidth: 80 }}>{inv.period}</span>
                <span style={{ fontSize: 13.5, color: "var(--text-body)" }}>{inv.amount} {currency}</span>
                <Badge tone={tone}>{label}</Badge>
                {inv.due_date && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>استحقاق {inv.due_date}</span>}
                <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                  {inv.status !== "paid" && (
                    <form action={setInvoiceStatus}>
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <input type="hidden" name="learnerId" value={id} />
                      <input type="hidden" name="status" value="paid" />
                      <SubmitButton pendingText="…" className={btn("success")}>علّمها مدفوعة</SubmitButton>
                    </form>
                  )}
                  {inv.status === "paid" && (
                    <form action={setInvoiceStatus}>
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <input type="hidden" name="learnerId" value={id} />
                      <input type="hidden" name="status" value="pending" />
                      <SubmitButton pendingText="…" className={btn("ghost")}>تراجع</SubmitButton>
                    </form>
                  )}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
