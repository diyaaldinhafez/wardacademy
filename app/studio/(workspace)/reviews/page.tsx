import { createClient } from "@/lib/supabase/server";
import { approveItem, rejectItem, updateReport, approveReport } from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ItemCard from "@/components/studio/ItemCard";
import { Card, AITrustBadge, Spark } from "@/components/ward/ui";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const objOf = (row: any) => (Array.isArray(row?.objectives) ? row.objectives[0] : row?.objectives) ?? {};
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, status, item_keys(answer, explanation, rubric), objectives(description, level)")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const { data: reportDrafts } = await supabase
    .from("session_reports")
    .select("id, summary, strengths, improve, status, sessions(scheduled_at, learner_id)")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const { data: people } = await supabase.from("profiles").select("id, full_name");
  const nameOf = new Map<string, string>();
  for (const p of (people ?? []) as any[]) nameOf.set(p.id, p.full_name ?? p.id);

  const drafts = items ?? [];
  const reports = reportDrafts ?? [];
  const empty = drafts.length === 0 && reports.length === 0;

  return (
    <>
      <Card variant="soft" style={{ display: "flex", alignItems: "center", gap: 10, borderColor: "var(--ward-purple-200)" }}>
        <Spark size={18} state="idle" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ward-purple-800)" }}>بانتظار مراجعتك</span>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا يصل شيءٌ للطالب أو العائلة قبل اعتمادك.</span>
      </Card>

      {empty && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا مسودّات بانتظار المراجعة الآن.</p>}

      {/* Homework drafts */}
      {drafts.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>واجبات مقترحة بالذكاء</h2>
            <AITrustBadge status="draft" compact />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{drafts.length} مسودّة</span>
          </div>
          {drafts.map((it: any) => {
            const o = objOf(it);
            return (
              <div key={it.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {o.description && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    الهدف: {o.level ? `${o.level} · ` : ""}{o.description}
                  </span>
                )}
                <ItemCard
                  it={it}
                  right={
                    <div style={{ display: "flex", gap: 8 }}>
                      <form action={approveItem}>
                        <input type="hidden" name="itemId" value={it.id} />
                        <SubmitButton pendingText="…" className={btn("success")}>اعتمِد وأرسِل</SubmitButton>
                      </form>
                      <form action={rejectItem}>
                        <input type="hidden" name="itemId" value={it.id} />
                        <SubmitButton pendingText="…" className={btn("ghost")}>ارفض</SubmitButton>
                      </form>
                    </div>
                  }
                />
              </div>
            );
          })}
        </section>
      )}

      {/* Session report drafts */}
      {reports.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>تقارير جلسات مقترحة بالذكاء</h2>
            <AITrustBadge status="draft" compact />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{reports.length} مسودّة</span>
          </div>
          {reports.map((r: any) => {
            const s = Array.isArray(r.sessions) ? r.sessions[0] : r.sessions;
            return (
              <Card key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: "var(--text-strong)", flex: 1 }}>
                    {nameOf.get(s?.learner_id) ?? "طالب"} · {s ? fmtUTC(s.scheduled_at) : ""}
                  </span>
                  <AITrustBadge status="draft" />
                </div>
                <form action={updateReport} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <textarea name="summary" required rows={2} defaultValue={r.summary ?? ""} className="ward-field__control" placeholder="ملخّص" />
                  <input name="strengths" defaultValue={r.strengths ?? ""} className="ward-field__control" placeholder="نقاط القوة" />
                  <input name="improve" defaultValue={r.improve ?? ""} className="ward-field__control" placeholder="للتحسين" />
                  <div style={{ display: "flex", gap: 8 }}>
                    <SubmitButton pendingText="…" className={btn("secondary")}>احفظ التعديلات</SubmitButton>
                  </div>
                </form>
                <form action={approveReport} style={{ marginTop: 8 }}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <SubmitButton pendingText="…" className={btn("success")}>اعتمِد التقرير — يظهر للعائلة</SubmitButton>
                </form>
              </Card>
            );
          })}
        </section>
      )}
    </>
  );
}
