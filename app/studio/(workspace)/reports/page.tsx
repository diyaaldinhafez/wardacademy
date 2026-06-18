import { createClient } from "@/lib/supabase/server";
import { draftReportWithAI, createReport } from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ScheduleForm from "@/components/studio/ScheduleForm";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: people } = await supabase.from("profiles").select("id, full_name, roles");
  const learners = (people ?? []).filter((p: any) => ((p.roles as string[]) ?? []).includes("learner"));
  const nameOf = new Map<string, string>();
  for (const l of learners) nameOf.set(l.id, (l.full_name as string) ?? l.id);
  const learnersForForm = learners.map((l: any) => ({ id: l.id, name: (l.full_name as string) ?? l.id }));

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, learner_id, session_reports(id, status)")
    .order("scheduled_at", { ascending: true });

  return (
    <>
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>جدوِل جلسة</p>
        {learnersForForm.length > 0 ? (
          <>
            <ScheduleForm learners={learnersForForm} />
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>يُدخَل بتوقيتك المحلّي ويُعرَض بـ UTC.</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>جهّز حساب طالبٍ أولاً من «طلبات التسجيل».</p>
        )}
      </Card>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>الجلسات</h2>
        {(sessions ?? []).length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا جلسات بعد.</p>}
        {(sessions ?? []).map((s: any) => {
          const report = Array.isArray(s.session_reports) ? s.session_reports[0] : s.session_reports;
          return (
            <Card key={s.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={nameOf.get(s.learner_id) ?? "?"} size={34} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{nameOf.get(s.learner_id) ?? s.learner_id}</span>
                  <br />
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{fmtUTC(s.scheduled_at)} · {s.duration_minutes} دقيقة</span>
                </span>
                <Badge tone="neutral">{s.status}</Badge>
              </div>

              <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
                {!report && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <form action={draftReportWithAI}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}>
                        <Spark size={15} /> ولّد التقرير بالذكاء
                      </SubmitButton>
                    </form>
                    <form action={createReport} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-body)" }}>…أو اكتبه يدوياً</p>
                      <textarea name="summary" required rows={2} placeholder="ملخّص" className="ward-field__control" />
                      <input name="strengths" placeholder="نقاط القوة (اختياري)" className="ward-field__control" />
                      <input name="improve" placeholder="للتحسين (اختياري)" className="ward-field__control" />
                      <SubmitButton pendingText="جارٍ الحفظ…" className={btn("secondary")}>احفظ (مسودّة)</SubmitButton>
                    </form>
                  </div>
                )}
                {report && report.status === "draft" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AITrustBadge status="draft" />
                    <a href="/studio/reviews" className={btn("ghost")}>راجِع واعتمِد في «مراجعات الذكاء» ←</a>
                  </div>
                )}
                {report && report.status === "approved" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AITrustBadge status="approved" />
                    <span style={{ fontSize: 13, color: "var(--leaf-700)" }}>ظاهرٌ للعائلة.</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </section>
    </>
  );
}
