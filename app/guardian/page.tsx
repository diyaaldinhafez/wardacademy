import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addChild, grantConsent } from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";
import WorkspaceHeader from "@/components/studio/WorkspaceHeader";
import { FlowerProgress, ScopeChip } from "@/components/bloom/Bloom";
import { SKILLS, SKILL_AR } from "@/lib/skills";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const first = (x: any) => (Array.isArray(x) ? x[0] : x) ?? {};
const card = "rounded-2xl border border-brand-100 bg-white p-4 shadow-ward-1";
const field = "rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400";

export default async function GuardianPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: children } = await supabase
    .from("guardianships")
    .select("learner_id, consent_granted, profiles!guardianships_learner_id_fkey(full_name, login_email)");
  const { data: prog } = await supabase
    .from("progress_records")
    .select("learner_id, attempts, correct, completions, objectives(description, level, skill)");
  const progByLearner = new Map<string, any[]>();
  for (const r of (prog ?? []) as any[]) {
    const arr = progByLearner.get(r.learner_id) ?? [];
    arr.push(r);
    progByLearner.set(r.learner_id, arr);
  }
  const { data: assess } = await supabase.from("skill_assessments").select("learner_id, skill, value, label");
  const speakingByLearner = new Map<string, { value: number; label: string | null }>();
  for (const a of (assess ?? []) as any[]) if (a.skill === "speaking") speakingByLearner.set(a.learner_id, { value: a.value, label: a.label });
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id, lesson_title")
    .order("scheduled_at", { ascending: false });
  const { data: reports } = await supabase.from("session_reports").select("session_id, summary, strengths, improve");
  const reportBySession = new Map<string, any>();
  for (const r of (reports ?? []) as any[]) reportBySession.set(r.session_id, r);
  // Completed assessments → the guardian sees the per-skill milestone result.
  const { data: doneAssess } = await supabase
    .from("assessments")
    .select("learner_id, title, unit, score, max_score, result, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  const assessByLearner = new Map<string, any[]>();
  for (const a of (doneAssess ?? []) as any[]) {
    const arr = assessByLearner.get(a.learner_id) ?? [];
    arr.push(a);
    assessByLearner.set(a.learner_id, arr);
  }
  const sessionsByLearner = new Map<string, any[]>();
  for (const s of (sessions ?? []) as any[]) {
    const arr = sessionsByLearner.get(s.learner_id) ?? [];
    arr.push(s);
    sessionsByLearner.set(s.learner_id, arr);
  }
  const { data: placements } = await supabase
    .from("placement_tests")
    .select("learner_id, status, suggested_level, created_at")
    .order("created_at", { ascending: false });
  const placementByLearner = new Map<string, any>();
  for (const pl of (placements ?? []) as any[]) if (!placementByLearner.has(pl.learner_id)) placementByLearner.set(pl.learner_id, pl);
  const { data: studyPlans } = await supabase
    .from("study_plans")
    .select("learner_id, title, items, track, scope_label, milestone_label")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  const planByLearner = new Map<string, any>();
  for (const sp of (studyPlans ?? []) as any[]) if (!planByLearner.has(sp.learner_id)) planByLearner.set(sp.learner_id, sp);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <WorkspaceHeader title="أبناؤك" subtitle={profile?.full_name ?? user.email ?? ""} />

      <section className={`mb-8 ${card}`}>
        <h2 className="mb-2 text-sm font-bold text-brand-700">أضِف طفلاً</h2>
        <form action={addChild} className="flex flex-wrap items-end gap-2">
          <input name="childName" required placeholder="اسم الطفل" className={field} />
          <input name="childPassword" required minLength={6} type="text" placeholder="اضبط كلمة مرور" dir="ltr" className={field} />
          <SubmitButton
            pendingText="جارٍ الإضافة…"
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-ward-1 hover:bg-brand-600 disabled:opacity-60"
          >
            إضافة
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-ink-soft">يُنشأ لطفلك دخولٌ بسيطٌ خاصّ به؛ بريده يظهر في الأسفل.</p>
      </section>

      {(children ?? []).length === 0 && <p className="text-sm text-ink-soft">لا أبناء مرتبطون بعد.</p>}

      <ul className="flex flex-col gap-4">
        {(children ?? []).map((c: any) => {
          const name = first(c.profiles).full_name ?? "الطفل";
          const rows = progByLearner.get(c.learner_id) ?? [];
          const pl = placementByLearner.get(c.learner_id);
          const plan = planByLearner.get(c.learner_id);
          return (
            <li key={c.learner_id} className={card}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold text-ink">{name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.consent_granted ? "bg-leaf/10 text-leaf" : "bg-amber/20 text-brand-900"
                  }`}
                >
                  {c.consent_granted ? "الموافقة ممنوحة" : "الموافقة معلّقة"}
                </span>
              </div>
              <p className="mb-2 text-xs text-ink-soft" dir="ltr">
                الدخول: {first(c.profiles).login_email ?? "—"}
              </p>
              {pl?.status === "completed" && (
                <p className="mb-2 text-xs">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">المستوى: {pl.suggested_level}</span>
                </p>
              )}
              {!c.consent_granted && (
                <form action={grantConsent} className="mb-3">
                  <input type="hidden" name="learnerId" value={c.learner_id} />
                  <SubmitButton
                    pendingText="جارٍ الحفظ…"
                    className="inline-flex h-9 items-center justify-center rounded-full bg-leaf px-4 text-sm font-semibold text-white shadow-ward-1 hover:brightness-95 disabled:opacity-60"
                  >
                    امنح الموافقة
                  </SubmitButton>
                </form>
              )}
              {plan && (() => {
                const units: { unit: string; lessons: any[] }[] = [];
                for (const it of ((plan.items as any[]) ?? [])) {
                  const u = (it.unit as string) || "الدروس";
                  let g = units[units.length - 1];
                  if (!g || g.unit !== u) { g = { unit: u, lessons: [] }; units.push(g); }
                  g.lessons.push(it);
                }
                return (
                  <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                    <p className="mb-1 text-xs font-bold text-brand-700">الخطّة: {plan.title}</p>
                    <div className="flex flex-col gap-2">
                      {units.map((g, gi) => (
                        <div key={gi}>
                          <p className="text-xs font-bold text-brand-700">{g.unit}</p>
                          <ol className="mt-0.5 list-decimal pr-4 text-xs text-ink-soft">
                            {g.lessons.map((it: any, i: number) => <li key={i}>{it.description}</li>)}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {rows.length === 0 ? (
                <p className="text-sm text-ink-soft">لا نشاط بعد — سيبدأ تقرير التفتّح بمجرّد أوّل واجب.</p>
              ) : (() => {
                const isM = (r: any) => r.attempts >= 1 && r.correct / Math.max(1, r.attempts) >= 0.6;
                const stats = SKILLS.map((sk) => {
                  const inSkill = rows.filter((r: any) => first(r.objectives).skill === sk);
                  return { skill: sk, total: inSkill.length, mastered: inSkill.filter(isM).length };
                });
                const sp = speakingByLearner.get(c.learner_id);
                const totalM = stats.reduce((a, s) => a + s.mastered, 0);
                const totalT = stats.reduce((a, s) => a + s.total, 0);
                const readOf = (m: number, t: number) => t === 0 ? "لم تبدأ بعد" : m / t >= 0.85 ? "تتفتّح — أداءٌ قويّ" : m / t >= 0.4 ? "تنمو بثبات" : "تحتاج رعاية";
                const valOf = (s: { skill: string; mastered: number; total: number }) => (s.skill === "speaking" ? sp?.value ?? 0 : s.total ? s.mastered / s.total : 0);
                return (
                  <div className="rounded-2xl border border-brand-100 bg-white p-3">
                    <div className="flex items-center gap-4">
                      <FlowerProgress size={96} skills={stats.map((s) => ({ label: SKILL_AR[s.skill], value: valOf(s), detail: s.skill === "speaking" ? sp?.label ?? "—" : `${s.mastered}/${s.total}` }))} />
                      <div className="flex-1">
                        {plan?.scope_label && <div className="mb-1"><ScopeChip track={plan.track === "school" ? "school" : "cefr"}>{plan.scope_label}</ScopeChip></div>}
                        <p className="text-sm text-ink" style={{ lineHeight: 1.8 }}>
                          وردة {name} هذا الأسبوع — أتقن <b>{totalM} من {totalT}</b> هدفاً. أرقامٌ حقيقيةٌ بلا تجميل.
                          {plan?.milestone_label ? <span className="text-ink-soft"> 🎯 {plan.milestone_label}.</span> : null}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-2 flex flex-col">
                      {stats.map((s) => (
                        <li key={s.skill} className="flex items-center gap-2 py-1.5 text-sm" style={{ borderTop: "1px solid var(--ink-100)" }}>
                          <span className="flex-1 font-medium text-ink">{SKILL_AR[s.skill]}</span>
                          {s.skill === "speaking" ? (
                            <span className="font-bold text-brand-700" style={{ whiteSpace: "nowrap" }}>{sp?.label ? `تقييم المعلّم: ${sp.label}` : "بانتظار تقييم المعلّم"}</span>
                          ) : (
                            <>
                              <span className="text-ink-soft">{readOf(s.mastered, s.total)}</span>
                              <span className="font-bold text-brand-700" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{s.mastered} من {s.total}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-ink-soft">«الأساس اللغوي» = المفردات والقواعد. التحدّث يُقيّمه المعلّم.</p>
                  </div>
                );
              })()}
              {(assessByLearner.get(c.learner_id) ?? []).length > 0 && (
                <div className="mt-3 border-t border-brand-100 pt-3">
                  <p className="mb-1 text-xs font-bold text-ink-soft">نتائج الاختبارات</p>
                  <ul className="flex flex-col gap-2">
                    {(assessByLearner.get(c.learner_id) ?? []).map((a: any, ai: number) => {
                      const result = (a.result ?? {}) as Record<string, { correct: number; total: number }>;
                      const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
                      return (
                        <li key={ai} className="rounded-xl bg-brand-50/60 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-ink">{a.unit ?? a.title}</span>
                            <span className="flex-shrink-0 text-sm font-bold text-leaf">{a.score}/{a.max_score} · {pct}%</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.entries(result).map(([sk, v]) => (
                              <span key={sk} className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-soft">{SKILL_AR[sk as keyof typeof SKILL_AR] ?? sk}: <b className="text-brand-700">{v.correct}/{v.total}</b></span>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {(() => {
                const withReport = (sessionsByLearner.get(c.learner_id) ?? []).filter((s: any) => reportBySession.get(s.id)).slice(0, 5);
                if (withReport.length === 0) return null;
                return (
                  <div className="mt-3 border-t border-brand-100 pt-3">
                    <p className="mb-1 text-xs font-bold text-ink-soft">تقارير الجلسات</p>
                    <ul className="flex flex-col gap-2">
                      {withReport.map((s: any) => {
                        const r = reportBySession.get(s.id);
                        return (
                          <li key={s.id} className="rounded-xl bg-brand-50/60 p-2.5 text-sm">
                            <p className="text-xs font-medium text-ink-soft">{fmtUTC(s.scheduled_at)}{s.lesson_title ? ` · ${s.lesson_title}` : ""}</p>
                            <p className="mt-0.5 text-ink">{r.summary}</p>
                            {r.strengths && <p className="text-ink-soft"><span className="font-medium">نقاط القوّة:</span> {r.strengths}</p>}
                            {r.improve && <p className="text-ink-soft"><span className="font-medium">الخطوة القادمة:</span> {r.improve}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
