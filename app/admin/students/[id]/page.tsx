/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createEnrollment,
  updateEnrollment,
  generateMonthlyInvoice,
  setInvoiceStatus,
  pauseEnrollment,
  resumeEnrollment,
  cancelEnrollment,
  createRequest,
  updateRequestStatus,
  saveEvaluation,
} from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import { REQUEST_TYPES, REQUEST_TYPE_AR, REQUEST_TYPE_TONE, REQUEST_STATUS_AR, REQUEST_STATUS_TONE } from "@/lib/requests";
import { fmtUTC } from "@/lib/datetime";

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
    .select("id, status, monthly_fee, sessions_per_month, start_date, cancel_reason")
    .eq("learner_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, period, amount, status, due_date, paid_at")
    .eq("learner_id", id)
    .order("period", { ascending: false });
  const { data: requests } = await supabase
    .from("requests")
    .select("id, type, details, status, resolution, created_at")
    .eq("learner_id", id)
    .order("created_at", { ascending: false });
  const { data: evals } = await supabase
    .from("evaluations")
    .select("id, period, teacher_rating, platform_rating, recommend, comment")
    .eq("learner_id", id)
    .order("period", { ascending: false });
  const { data: sessions } = await supabase.from("sessions").select("scheduled_at, status").eq("learner_id", id);

  const now = new Date();
  const thisPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisEval = (evals ?? []).find((e: any) => e.period === thisPeriod);
  const stars = (n?: number | null) => (n ? "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n) : "—");
  const today = now.toISOString().slice(0, 10);
  const nowMs = now.getTime();
  const sessList = (sessions ?? []) as any[];
  const sessDone = sessList.filter((s) => s.status === "completed").length;
  const sessUpcoming = sessList.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() >= nowMs).length;
  const sessMissed = sessList.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() < nowMs).length;

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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--border-soft)", paddingTop: 10, alignItems: "center" }}>
            {enr.status === "active" && (
              <form action={pauseEnrollment}>
                <input type="hidden" name="enrollmentId" value={enr.id} />
                <input type="hidden" name="learnerId" value={id} />
                <SubmitButton pendingText="…" className={btn("secondary")}>علّق الاشتراك مؤقّتاً</SubmitButton>
              </form>
            )}
            {(enr.status === "paused" || enr.status === "cancelled") && (
              <form action={resumeEnrollment}>
                <input type="hidden" name="enrollmentId" value={enr.id} />
                <input type="hidden" name="learnerId" value={id} />
                <SubmitButton pendingText="…" className={btn("success")}>{enr.status === "cancelled" ? "إعادة التفعيل" : "استئناف الاشتراك"}</SubmitButton>
              </form>
            )}
            {enr.status !== "cancelled" && (
              <details>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--rose-700)" }}>إيقافٌ نهائيّ</summary>
                <form action={cancelEnrollment} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
                  <input type="hidden" name="enrollmentId" value={enr.id} />
                  <input type="hidden" name="learnerId" value={id} />
                  <input name="reason" placeholder="سبب الإيقاف" className={ctl} style={{ width: "auto" }} />
                  <SubmitButton pendingText="…" className={btn("danger")}>تأكيد الإيقاف النهائيّ</SubmitButton>
                </form>
              </details>
            )}
          </div>
          {enr.status === "cancelled" && enr.cancel_reason && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>سبب الإيقاف: {enr.cancel_reason}</p>
          )}
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

      {/* Attendance */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>الحضور والجلسات</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13.5, color: "var(--text-body)" }}>
          <span>مكتملة: <strong style={{ color: "var(--leaf-700)" }}>{sessDone}</strong></span>
          <span>قادمة: <strong style={{ color: "var(--text-strong)" }}>{sessUpcoming}</strong></span>
          <span>فائتة (دون تقرير): <strong style={{ color: sessMissed > 0 ? "var(--rose-700)" : "var(--text-strong)" }}>{sessMissed}</strong></span>
        </div>
        {sessMissed > 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>جلساتٌ ماضيةٌ لم تُعلَّم مكتملةً — قد تشير لفتورٍ يستحقّ المتابعة.</p>
        )}
      </Card>

      {/* Periodic evaluation */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={secTitle}>تقييم وليّ الأمر {thisEval && <Badge tone="success">سُجّل لهذا الشهر</Badge>}</div>
        <form action={saveEvaluation} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="hidden" name="learnerId" value={id} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {[
              { name: "teacherRating", label: "المعلّمة", val: thisEval?.teacher_rating },
              { name: "platformRating", label: "المنصّة", val: thisEval?.platform_rating },
              { name: "recommend", label: "التوصية", val: thisEval?.recommend },
            ].map((f) => (
              <div key={f.name}>
                <label style={flabel}>{f.label}</label>
                <select name={f.name} defaultValue={f.val ?? ""} className={ctl} style={{ width: 110 }}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} ★</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <textarea name="comment" rows={2} defaultValue={thisEval?.comment ?? ""} placeholder="تعليق وليّ الأمر (اختياري)" className={ctl} />
          <SubmitButton pendingText="…" className={btn("success", "md")}>احفظ تقييم هذا الشهر</SubmitButton>
        </form>
        {(evals ?? []).length > 0 && (
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {(evals ?? []).map((e: any) => {
              const low = (e.teacher_rating && e.teacher_rating <= 2) || (e.platform_rating && e.platform_rating <= 2);
              return (
                <div key={e.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: "var(--text-strong)", minWidth: 70 }}>{e.period}</span>
                    <span style={{ color: "var(--text-body)" }}>المعلّمة {stars(e.teacher_rating)} · المنصّة {stars(e.platform_rating)}{e.recommend ? ` · توصية ${stars(e.recommend)}` : ""}</span>
                    {low && <Badge tone="danger">تقييمٌ منخفض</Badge>}
                  </div>
                  {e.comment && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>«{e.comment}»</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Requests & complaints */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={secTitle}>الطلبات والشكاوى</div>
        {(requests ?? []).map((r: any) => (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 6, borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge tone={REQUEST_TYPE_TONE[r.type] ?? "neutral"}>{REQUEST_TYPE_AR[r.type] ?? r.type}</Badge>
              <Badge tone={REQUEST_STATUS_TONE[r.status] ?? "neutral"}>{REQUEST_STATUS_AR[r.status] ?? r.status}</Badge>
              <span style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--text-muted)" }}>{fmtUTC(r.created_at)}</span>
            </div>
            {r.details && <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>{r.details}</p>}
            {r.resolution && <p style={{ fontSize: 13, color: "var(--leaf-700)" }}>الحلّ: {r.resolution}</p>}
            {r.status !== "closed" && (
              <form action={updateRequestStatus} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <input type="hidden" name="requestId" value={r.id} />
                <input type="hidden" name="learnerId" value={id} />
                <input name="resolution" placeholder="ملاحظة الحلّ (اختياري)" className={ctl} style={{ width: "auto", flex: 1, minWidth: 160 }} />
                <button type="submit" name="status" value="closed" className={btn("success")}>إغلاق</button>
              </form>
            )}
          </div>
        ))}
        <form action={createRequest} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="learnerId" value={id} />
          <select name="type" defaultValue="complaint" className={ctl}>
            {REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <textarea name="details" rows={2} placeholder="تفاصيل الطلب أو الشكوى" className={ctl} />
          <SubmitButton pendingText="…" className={btn("secondary", "md")}>سجّل الطلب</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
