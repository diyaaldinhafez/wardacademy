/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startPlacement, startPlan, approvePlan, materializePlanObjectives, draftReportWithAI } from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ScheduleForm from "@/components/studio/ScheduleForm";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { bloomStage } from "@/lib/progress";
import { petalValues } from "@/lib/skills";
import { FORMAT_LABELS } from "@/lib/items";
import { fmtUTC } from "@/lib/datetime";

const objOf = (o: any) => (Array.isArray(o) ? o[0] : o) ?? {};
const one = (o: any) => (Array.isArray(o) ? o[0] : o);
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)" } as const;
const AR_STAGE: Record<string, string> = {
  "Not started": "لم يبدأ", Practiced: "تدرّب", Sprouting: "بذرة", Budding: "برعم", Growing: "ينمو", Blooming: "متفتّح",
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: learner } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id").eq("id", id).maybeSingle();
  if (!learner || !((learner.roles as string[]) ?? []).includes("learner")) notFound();
  if (learner.assigned_instructor_id && learner.assigned_instructor_id !== user?.id) notFound();

  const { data: pl } = await supabase.from("placement_tests").select("status, suggested_level, created_at").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: plan } = await supabase.from("study_plans").select("id, title, level, items, status").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: prog } = await supabase.from("progress_records").select("attempts, correct, completions, objectives(description, level, skill)").eq("learner_id", id);
  const rows = (prog ?? []) as any[];
  const petals = petalValues(rows.map((r) => ({ attempts: r.attempts, correct: r.correct, skill: objOf(r.objectives).skill })));

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, session_reports(id, status)")
    .eq("learner_id", id)
    .order("scheduled_at", { ascending: true });
  const nowIso = new Date().toISOString();
  const upcoming = (sessions ?? []).filter((s: any) => s.status === "scheduled" && s.scheduled_at >= nowIso);
  const past = (sessions ?? []).filter((s: any) => !(s.status === "scheduled" && s.scheduled_at >= nowIso));

  const { data: assignments } = await supabase.from("assignments").select("created_at, items(id, prompt, format, difficulty)").eq("learner_id", id).order("created_at", { ascending: false });
  const { data: subs } = await supabase.from("submissions").select("item_id, is_correct, graded, counts_toward_mastery").eq("learner_id", id);
  const subByItem = new Map<string, any>();
  for (const s of (subs ?? []) as any[]) subByItem.set(s.item_id, s);

  const name = (learner.full_name as string) ?? id;
  const learnerForForm = [{ id, name }];

  const SessionRow = ({ s }: { s: any }) => {
    const report = one(s.session_reports);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--ink-100)", paddingBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(s.scheduled_at)} · {s.duration_minutes} دقيقة</span>
          <Badge tone={s.status === "completed" ? "success" : s.status === "scheduled" ? "brand" : "neutral"}>{s.status}</Badge>
          {report?.status === "approved" && <AITrustBadge status="approved" compact />}
          {report?.status === "draft" && <AITrustBadge status="draft" compact />}
        </div>
        {!report && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <form action={draftReportWithAI}>
              <input type="hidden" name="sessionId" value={s.id} />
              <SubmitButton pendingText="…" className={btn("soft")}><Spark size={14} /> ولّد تقريراً</SubmitButton>
            </form>
          </div>
        )}
        {report?.status === "draft" && <a href="/studio/reviews" className={btn("ghost")}>راجِع واعتمِد ←</a>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <Link href="/studio/students" className={btn("ghost")} style={{ alignSelf: "flex-start" }}>→ كلّ الطلاب</Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={name} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{name}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {pl?.status === "completed" ? <Badge tone="success">المستوى {pl.suggested_level}</Badge> : pl?.status === "in_progress" ? <Badge tone="warning">التحديد جارٍ</Badge> : <Badge tone="neutral">بلا تحديد</Badge>}
            {plan && (plan.status === "approved" ? <Badge tone="success">خطّة معتمَدة</Badge> : <Badge tone="warning">خطّة مسودّة</Badge>)}
          </div>
        </div>
      </div>

      {/* المواعيد */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={secTitle}>المواعيد</div>
        <ScheduleForm learners={learnerForForm} />
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>يُدخَل بتوقيتك المحلّي ويُعرَض بـ UTC.</p>
        {upcoming.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--leaf-700)" }}>القادمة ({upcoming.length})</p>
            {upcoming.map((s: any) => <SessionRow key={s.id} s={s} />)}
          </div>
        )}
        {past.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>السابقة ({past.length})</p>
            {past.map((s: any) => <SessionRow key={s.id} s={s} />)}
          </div>
        )}
        {(sessions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسات بعد.</p>}
      </Card>

      {/* الخطة الدراسية + التحديد */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secTitle}>الخطّة الدراسية</span>
          {pl?.status !== "in_progress" && (
            <form action={startPlacement} style={{ marginInlineStart: "auto" }}>
              <input type="hidden" name="learnerId" value={id} />
              <SubmitButton pendingText="…" className={btn("ghost")}>{pl?.status === "completed" ? "أعِد التحديد" : "ابدأ اختبار التحديد"}</SubmitButton>
            </form>
          )}
        </div>
        {plan ? (
          <div style={{ borderRadius: 12, border: "1px solid var(--ward-purple-100)", background: "var(--surface-soft)", padding: 12 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>
              {plan.title} {plan.status === "draft" ? <Badge tone="warning">مسودّة</Badge> : <Badge tone="success">معتمَدة</Badge>}
            </p>
            <ol style={{ margin: "8px 18px 0 0", fontSize: 13, color: "var(--text-muted)", listStyle: "decimal", display: "flex", flexDirection: "column", gap: 3 }}>
              {(plan.items as any[]).map((it, i) => <li key={i}>{it.level ? `${it.level} · ` : ""}{it.description}</li>)}
            </ol>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {plan.status === "draft" && <form action={approvePlan}><input type="hidden" name="planId" value={plan.id} /><SubmitButton pendingText="…" className={btn("success")}>اعتمِد الخطّة</SubmitButton></form>}
              {plan.status === "approved" && <form action={materializePlanObjectives}><input type="hidden" name="planId" value={plan.id} /><SubmitButton pendingText="…" className={btn("secondary")}>أضِف الأهداف للمنهاج</SubmitButton></form>}
            </div>
          </div>
        ) : (
          <form action={startPlan}><input type="hidden" name="learnerId" value={id} /><SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}><Spark size={14} /> ولّد خطّةً بالذكاء</SubmitButton></form>
        )}
      </Card>

      {/* المنهاج والتقدّم */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={secTitle}>المنهاج والتقدّم</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {petals.map((p) => (
            <span key={p.name} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "3px 10px" }}>
              {p.ar} {Math.round(p.value)}%
            </span>
          ))}
        </div>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا نشاط بعد — أضِف أهدافاً من الخطّة، ثمّ أسنِد واجبات.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r, i) => {
              const o = objOf(r.objectives);
              const stage = bloomStage(r);
              return (
                <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--text-body)" }}>{o.level ? `${o.level} · ` : ""}{o.description ?? "هدف"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <Badge tone="success">{AR_STAGE[stage.label] ?? stage.label}</Badge>
                    <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{r.correct}/{r.attempts}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* الواجبات */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secTitle}>الواجبات <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({(assignments ?? []).length})</span></span>
          <Link href="/studio/homework" className={btn("ghost")} style={{ marginInlineStart: "auto" }}>أسنِد واجباً ←</Link>
        </div>
        {(assignments ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا واجبات مُسنَدة بعد.</p>}
        {(assignments ?? []).map((a: any, i: number) => {
          const it = one(a.items);
          if (!it) return null;
          const sub = subByItem.get(it.id);
          const status = !sub ? { tone: "neutral" as const, label: "لم يُسلَّم" } : !sub.graded ? { tone: "warning" as const, label: "بانتظار التصحيح" } : !sub.counts_toward_mastery ? { tone: "brand" as const, label: "أُنجز" } : sub.is_correct ? { tone: "success" as const, label: "صحيح" } : { tone: "danger" as const, label: "يحتاج مراجعة" };
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-body)", flex: 1 }}>{it.prompt}</span>
              <Badge tone="neutral">{FORMAT_LABELS[it.format as keyof typeof FORMAT_LABELS] ?? it.format}</Badge>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
