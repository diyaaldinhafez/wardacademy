import { createClient } from "@/lib/supabase/server";
import { startPlacement, startPlan, approvePlan, materializePlanObjectives } from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import { bloomStage } from "@/lib/progress";
import { petalValues } from "@/lib/skills";

/* eslint-disable @typescript-eslint/no-explicit-any */
const objOf = (o: any) => (Array.isArray(o) ? o[0] : o) ?? {};
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const AR_STAGE: Record<string, string> = {
  "Not started": "لم يبدأ", Practiced: "تدرّب", Sprouting: "بذرة", Budding: "برعم", Growing: "ينمو", Blooming: "متفتّح",
};

export default async function StudentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const learners = (people ?? []).filter(
    (p: any) =>
      ((p.roles as string[]) ?? []).includes("learner") && (!p.assigned_instructor_id || p.assigned_instructor_id === user?.id),
  );

  const { data: prog } = await supabase
    .from("progress_records")
    .select("learner_id, attempts, correct, completions, objectives(description, level, skill)");
  const progByLearner = new Map<string, any[]>();
  for (const r of (prog ?? []) as any[]) {
    const arr = progByLearner.get(r.learner_id) ?? [];
    arr.push(r);
    progByLearner.set(r.learner_id, arr);
  }

  const { data: placements } = await supabase.from("placement_tests").select("learner_id, status, suggested_level, created_at").order("created_at", { ascending: false });
  const plOf = new Map<string, any>();
  for (const pl of (placements ?? []) as any[]) if (!plOf.has(pl.learner_id)) plOf.set(pl.learner_id, pl);

  const { data: studyPlans } = await supabase.from("study_plans").select("id, learner_id, title, level, items, status, created_at").order("created_at", { ascending: false });
  const planOf = new Map<string, any>();
  for (const sp of (studyPlans ?? []) as any[]) if (!planOf.has(sp.learner_id)) planOf.set(sp.learner_id, sp);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>الطلاب <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({learners.length})</span></h2>
      {learners.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا طلاب بعد — جهّز حساباً من «طلبات التسجيل».</p>}

      {learners.map((l: any) => {
        const rows = progByLearner.get(l.id) ?? [];
        const pl = plOf.get(l.id);
        const plan = planOf.get(l.id);
        const petals = petalValues(rows.map((r) => ({ attempts: r.attempts, correct: r.correct, skill: objOf(r.objectives).skill })));
        return (
          <Card key={l.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={l.full_name ?? l.id} size={36} />
              <span style={{ fontWeight: 700, color: "var(--text-strong)", flex: 1 }}>{l.full_name ?? l.id}</span>
              {pl?.status === "completed" && <Badge tone="success">المستوى {pl.suggested_level}</Badge>}
              {pl?.status === "in_progress" && <Badge tone="warning">التحديد جارٍ</Badge>}
              {pl?.status !== "in_progress" && (
                <form action={startPlacement}>
                  <input type="hidden" name="learnerId" value={l.id} />
                  <SubmitButton pendingText="…" className={btn("ghost")}>{pl?.status === "completed" ? "أعِد التحديد" : "ابدأ التحديد"}</SubmitButton>
                </form>
              )}
            </div>

            {/* Compact 5-skill mastery (numbers, not a garden) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {petals.map((p) => (
                <span key={p.name} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "2px 9px" }}>
                  {p.ar} {Math.round(p.value)}%
                </span>
              ))}
            </div>

            {/* Plan */}
            {plan ? (
              <div style={{ borderRadius: 12, border: "1px solid var(--ward-purple-100)", background: "var(--surface-soft)", padding: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>
                  الخطّة: {plan.title} {plan.status === "draft" ? <Badge tone="warning">مسودّة</Badge> : <Badge tone="success">معتمَدة</Badge>}
                </p>
                <ol style={{ margin: "6px 18px 0 0", fontSize: 12.5, color: "var(--text-muted)", listStyle: "decimal" }}>
                  {(plan.items as any[]).map((it, i) => <li key={i}>{it.level ? `${it.level} · ` : ""}{it.description}</li>)}
                </ol>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {plan.status === "draft" && (
                    <form action={approvePlan}><input type="hidden" name="planId" value={plan.id} /><SubmitButton pendingText="…" className={btn("success")}>اعتمِد الخطّة</SubmitButton></form>
                  )}
                  {plan.status === "approved" && (
                    <form action={materializePlanObjectives}><input type="hidden" name="planId" value={plan.id} /><SubmitButton pendingText="…" className={btn("secondary")}>أضِف الأهداف</SubmitButton></form>
                  )}
                </div>
              </div>
            ) : (
              <form action={startPlan}><input type="hidden" name="learnerId" value={l.id} /><SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}>ولّد خطّة بالذكاء</SubmitButton></form>
            )}

            {/* Objective progress */}
            {rows.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا نشاط بعد.</p>
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
        );
      })}
    </section>
  );
}
