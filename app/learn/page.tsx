import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { unitStage, SKILLS, SKILL_AR, type BloomStage } from "@/lib/skills";
import { FlowerProgress, UnitBloom as BloomUnit, ScopeChip } from "@/components/bloom/Bloom";
import { submitPlacement, submitManualHomework, submitAssessment } from "./actions";
import AnswerForm from "@/components/learn/AnswerForm";
import SubmitButton from "@/components/studio/SubmitButton";
import WorkspaceHeader from "@/components/studio/WorkspaceHeader";
import VideoCall from "@/components/VideoCall";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const objOf = (row: any) => (Array.isArray(row?.objectives) ? row.objectives[0] : row?.objectives) ?? {};
const AR_FORMAT: Record<string, string> = {
  multiple_choice: "اختيار من متعدّد",
  fill_blank: "أكمل الفراغ",
  true_false: "صح / خطأ",
  matching: "توصيل",
  open: "إجابة مفتوحة",
  audio: "تسجيل صوتي",
};
const card = "rounded-2xl border border-brand-100 bg-white p-4 shadow-ward-1";
const h2 = "mb-3 text-lg font-bold text-ink";

export default async function LearnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, origin, objective_id, objectives(description, level)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  const { data: subs } = await supabase
    .from("submissions")
    .select("item_id, is_correct, graded, created_at")
    .order("created_at", { ascending: false });
  const { data: prog } = await supabase
    .from("progress_records")
    .select("attempts, correct, completions, objectives(description, level, skill, unit)");
  const { data: manualHw } = await supabase
    .from("manual_homework")
    .select("id, title, instructions, status, score, max_score, feedback, homework_files(id, kind, file_path)")
    .eq("learner_id", user.id)
    .order("created_at", { ascending: false });
  const hwUrls = new Map<string, string>();
  {
    const all = (manualHw ?? []).flatMap((h: any) => h.homework_files ?? []);
    if (all.length) {
      const admin = createAdminClient();
      await Promise.all(all.map(async (f: any) => {
        const { data } = await admin.storage.from("homework-files").createSignedUrl(f.file_path, 3600);
        if (data?.signedUrl) hwUrls.set(f.id, data.signedUrl);
      }));
    }
  }
  const { data: sessions } = await supabase.from("sessions").select("id, scheduled_at, duration_minutes").order("scheduled_at");
  const { data: reports } = await supabase.from("session_reports").select("session_id, summary, strengths, improve");
  const reportBySession = new Map<string, any>();
  for (const r of (reports ?? []) as any[]) reportBySession.set(r.session_id, r);
  const { data: placement } = await supabase
    .from("placement_tests")
    .select("id, status, suggested_level")
    .eq("learner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let placementQuestions: any[] = [];
  if (placement?.status === "in_progress") {
    const admin = createAdminClient();
    const { data } = await admin.from("placement_questions").select("id, prompt, content, position").eq("placement_test_id", placement.id).order("position");
    placementQuestions = data ?? [];
  }

  // A ready unit assessment takes priority (like placement) until the child takes it.
  const { data: readyAssessment } = await supabase
    .from("assessments")
    .select("id, title, unit")
    .eq("learner_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let assessmentQuestions: any[] = [];
  if (readyAssessment) {
    const admin = createAdminClient();
    const { data } = await admin.from("assessment_questions").select("id, prompt, content, position").eq("assessment_id", readyAssessment.id).order("position");
    assessmentQuestions = data ?? [];
  }

  // Completed assessments → the child sees their result (per skill).
  const { data: doneAssessments } = await supabase
    .from("assessments")
    .select("id, title, unit, score, max_score, result, completed_at")
    .eq("learner_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const { data: studyPlan } = await supabase
    .from("study_plans")
    .select("title, level, items, track, scope_label, milestone_label")
    .eq("learner_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastByItem = new Map<string, { is_correct: boolean | null; graded: boolean }>();
  for (const s of (subs ?? []) as any[]) {
    if (!lastByItem.has(s.item_id)) lastByItem.set(s.item_id, { is_correct: s.is_correct, graded: s.graded });
  }

  // Flower (5 skills) + the daily unit hero — from real progress.
  const progRows = (prog ?? []).map((p: any) => ({ attempts: p.attempts, correct: p.correct, o: objOf(p), stage: unitStage(p) }));
  const inProgress = progRows.filter((p) => p.stage !== "bloom").sort((a, b) => b.attempts - a.attempts);
  const currentUnit = inProgress[0] ?? progRows[0];

  // Honest per-skill mastery for the flower.
  const isMastered = (r: { attempts: number; correct: number }) => r.attempts >= 1 && r.correct / Math.max(1, r.attempts) >= 0.6;
  const skillStats = SKILLS.map((sk) => {
    const inSkill = progRows.filter((p) => p.o.skill === sk);
    return { skill: sk, total: inSkill.length, mastered: inSkill.filter(isMastered).length };
  });
  const { data: skillAssess } = await supabase.from("skill_assessments").select("skill, value, label").eq("learner_id", user.id);
  const speakingAssess = (skillAssess ?? []).find((a: any) => a.skill === "speaking") as { value: number; label: string | null } | undefined;
  const skillValue = (sk: string, m: number, t: number) => (sk === "speaking" ? speakingAssess?.value ?? 0 : t ? m / t : 0);

  // The garden path: the plan's units, each mastered / current / upcoming.
  const planItems = (studyPlan?.items as any[]) ?? [];
  const gardenUnits: { unit: string; status: "mastered" | "current" | "upcoming"; stage: BloomStage }[] = [];
  const seen = new Set<string>();
  for (const it of planItems) {
    const u = (it.unit as string) || "الدروس";
    if (seen.has(u)) continue;
    seen.add(u);
    const uRows = progRows.filter((p) => ((p.o.unit as string) || "الدروس") === u);
    const practiced = uRows.filter((p) => p.attempts > 0);
    const status = practiced.length === 0 ? "upcoming" : uRows.every((p) => p.stage === "bloom") ? "mastered" : "current";
    gardenUnits.push({ unit: u, status, stage: status === "mastered" ? "bloom" : status === "current" ? "balloon" : "bud" });
  }
  const STATUS_AR: Record<string, string> = { mastered: "تفتّحت", current: "أنت هنا", upcoming: "قادمة" };

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <WorkspaceHeader title="حديقتي" subtitle={profile?.full_name ?? user.email ?? ""} />

      {/* A ready unit assessment (takes over until taken) */}
      {readyAssessment && (
        <section className={`mb-10 ${card}`}>
          <h2 className="mb-1 text-lg font-bold text-ink">🎯 اختبار: {readyAssessment.unit}</h2>
          <p className="mb-4 text-sm text-ink-soft">أجِب عن الأسئلة لتُظهر ما تعلّمته — أنت تستطيع! 🌟</p>
          <form action={submitAssessment} className="flex flex-col gap-4">
            <input type="hidden" name="assessmentId" value={readyAssessment.id} />
            {assessmentQuestions.map((q: any, idx: number) => (
              <div key={q.id}>
                <p className="font-medium text-ink" dir="ltr">{idx + 1}. {q.prompt}</p>
                <div className="mt-1 flex flex-col gap-1.5" dir="ltr">
                  {((q.content?.options ?? []) as string[]).map((o, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-100 bg-cream/50 px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
                      <input type="radio" name={`q_${q.id}`} value={o} required className="h-4 w-4 accent-[#7F55D9]" /> {o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <SubmitButton pendingText="جارٍ التسليم…" className="inline-flex h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-ward-1 hover:bg-brand-600 disabled:opacity-60">
              سلّم الاختبار
            </SubmitButton>
          </form>
        </section>
      )}

      {/* Placement (takes over when active) */}
      {placement?.status === "in_progress" && (
        <section className={`mb-10 ${card}`}>
          <h2 className="mb-1 text-lg font-bold text-ink">اختبار تحديد المستوى</h2>
          <p className="mb-4 text-sm text-ink-soft">أجِب عن الأسئلة لنعرف مستواك.</p>
          <form action={submitPlacement} className="flex flex-col gap-4">
            <input type="hidden" name="testId" value={placement.id} />
            {placementQuestions.map((q: any, idx: number) => (
              <div key={q.id}>
                <p className="font-medium text-ink" dir="ltr">{idx + 1}. {q.prompt}</p>
                <div className="mt-1 flex flex-col gap-1.5" dir="ltr">
                  {((q.content?.options ?? []) as string[]).map((o, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-100 bg-cream/50 px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
                      <input type="radio" name={`q_${q.id}`} value={o} required className="h-4 w-4 accent-[#7F55D9]" /> {o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <SubmitButton pendingText="جارٍ الإرسال…" className="inline-flex h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-ward-1 hover:bg-brand-600 disabled:opacity-60">
              إرسال الاختبار
            </SubmitButton>
          </form>
        </section>
      )}
      {placement?.status === "completed" && placement.suggested_level && (
        <section className="mb-8 rounded-2xl border border-leaf/30 bg-leaf/5 p-4 text-sm text-ink">
          مستواك: <span className="font-bold text-leaf">{placement.suggested_level}</span>
        </section>
      )}

      {/* Daily hero: the current unit bud -> balloon -> bloom */}
      {currentUnit && (
        <section className="mb-8">
          <h2 className={h2}>درس اليوم</h2>
          <div className="flex items-center gap-4 rounded-2xl p-5 text-white shadow-ward-2" style={{ background: "var(--grad-bloom, linear-gradient(135deg,#9F7DE7,#6840BD))" }}>
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(41,23,78,0.26)" }}>
              <BloomUnit stage={currentUnit.stage} size={60} pop={currentUnit.stage === "bloom"} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold leading-tight" dir="ltr">{currentUnit.o.description ?? "Lesson"}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--ward-purple-100)" }}>
                {currentUnit.stage === "bloom" ? "تفتّح! أتقنتَ هذا الدرس 🎉" : currentUnit.stage === "balloon" ? "بالونك ينتفخ — أكمِل لتُتقنه" : "ابدأ هذا الدرس"}
              </p>
              <p className="mt-1 text-xs font-bold" style={{ color: "var(--ward-purple-100)", fontVariantNumeric: "tabular-nums" }}>{currentUnit.correct} / {currentUnit.attempts}</p>
            </div>
          </div>
        </section>
      )}

      {/* The garden path: the plan's units as a journey */}
      {gardenUnits.length > 0 && (
        <section className="mb-8">
          <h2 className={h2}>مسار حديقتي</h2>
          <div className={card}>
            <ul className="flex flex-col">
              {gardenUnits.map((g, i) => (
                <li key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < gardenUnits.length - 1 ? "1px solid var(--ink-100)" : "none" }}>
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full" style={{ background: g.status === "mastered" ? "var(--ward-purple-50)" : g.status === "current" ? "#fff" : "var(--ink-100)", border: g.status === "current" ? "2px solid var(--brand)" : "2px solid transparent" }}>
                    <BloomUnit stage={g.stage} size={34} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" dir="ltr" style={{ color: g.status === "upcoming" ? "var(--text-muted)" : "var(--text-strong)" }}>{g.unit}</p>
                    <p className="text-xs text-ink-soft">{STATUS_AR[g.status]}</p>
                  </div>
                  {g.status === "current" ? <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--apricot-100, #ffeedc)", color: "var(--apricot-600, #c97a2b)" }}>الآن</span> : g.status === "mastered" ? <span className="text-leaf">✓</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* The skill flower (slower snapshot) */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-bold text-ink">وردتي</h2>
          {studyPlan?.scope_label && <ScopeChip>{studyPlan.scope_label}</ScopeChip>}
        </div>
        <div className={card}>
          <div className="flex items-center gap-4">
            <FlowerProgress size={104} skills={skillStats.map((s) => ({ label: SKILL_AR[s.skill], value: skillValue(s.skill, s.mastered, s.total), detail: s.skill === "speaking" ? speakingAssess?.label ?? "—" : `${s.mastered}/${s.total}` }))} />
            <p className="flex-1 text-sm text-ink-soft" style={{ lineHeight: 1.8 }}>
              كل بتلةٍ مهارة — تنمو ببطءٍ كلّما أتقنتَ أهدافها. الأرقام صادقة: عدد الأهداف المُتقَنة من إجماليها.
            </p>
          </div>
        </div>
      </section>

      {/* Study plan */}
      {studyPlan && (
        <section className="mb-8">
          <h2 className={h2}>خطّتي</h2>
          <div className={card}>
            <p className="font-bold text-ink">{studyPlan.title}</p>
            <ol className="mt-2 list-decimal pr-5 text-sm text-ink-soft">
              {((studyPlan.items as any[]) ?? []).map((it, i) => (
                <li key={i}>{it.level ? `${it.level} · ` : ""}{it.description}</li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Sessions */}
      <section className="mb-8">
        <h2 className={h2}>جلساتي</h2>
        {(sessions ?? []).length === 0 && <p className="text-sm text-ink-soft">لا جلسات مجدولة بعد.</p>}
        <ul className="flex flex-col gap-2">
          {(sessions ?? []).map((s: any) => {
            const r = reportBySession.get(s.id);
            return (
              <li key={s.id} className={card}>
                <p className="text-sm font-medium text-ink">{fmtUTC(s.scheduled_at)} · {s.duration_minutes} دقيقة</p>
                <div className="mt-2"><VideoCall sessionId={s.id} label="ادخل الجلسة" /></div>
                {r && (
                  <div className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">
                    <p className="font-bold text-brand-700">تقرير الجلسة</p>
                    <p className="text-ink">{r.summary}</p>
                    {r.strengths && <p className="text-ink-soft"><span className="font-medium">نقاط القوة:</span> {r.strengths}</p>}
                    {r.improve && <p className="text-ink-soft"><span className="font-medium">للتحسين:</span> {r.improve}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Assessment results */}
      {(doneAssessments ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className={h2}>نتائج اختباراتي 🎯</h2>
          <ul className="flex flex-col gap-3">
            {(doneAssessments ?? []).map((a: any) => {
              const result = (a.result ?? {}) as Record<string, { correct: number; total: number }>;
              const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
              return (
                <li key={a.id} className={card}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-ink">{a.unit ?? a.title}</p>
                    <span className="flex-shrink-0 rounded-full bg-leaf/10 px-2.5 py-0.5 text-sm font-bold text-leaf">{a.score}/{a.max_score} · {pct}%</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {Object.entries(result).map(([sk, v]) => {
                      const p = v.total ? Math.round((v.correct / v.total) * 100) : 0;
                      return (
                        <li key={sk} className="flex items-center gap-2 text-sm">
                          <span className="w-20 flex-shrink-0 text-ink">{SKILL_AR[sk as keyof typeof SKILL_AR] ?? sk}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand" style={{ width: `${p}%` }} /></div>
                          <span className="w-10 text-end font-bold text-brand-700" style={{ fontVariantNumeric: "tabular-nums" }}>{v.correct}/{v.total}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Homework */}
      <section>
        <h2 className={h2}>واجباتي</h2>
        {(items ?? []).length === 0 && <p className="text-sm text-ink-soft">لا واجبات بعد. سيضيف معلّمك قريباً.</p>}
        <ul className="flex flex-col gap-3">
          {(items ?? []).map((it: any) => {
            const last = lastByItem.get(it.id);
            const options = (it.content?.options ?? []) as string[];
            return (
              <li key={it.id} className={card}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">{AR_FORMAT[it.format] ?? it.format}</span>
                  <span className="inline-flex items-center gap-1 text-leaf">✓ معتمَد من معلّمك</span>
                </div>
                <p className="whitespace-pre-line font-medium text-ink" dir="ltr">{it.prompt}</p>
                {last && (
                  <p className="mt-2 text-sm">
                    {!last.graded ? (
                      <span className="text-ink-soft">أُرسل ✓</span>
                    ) : last.is_correct ? (
                      <span className="font-bold text-leaf">إجابةٌ صحيحة ✓</span>
                    ) : (
                      <span className="font-bold text-rose-600">ليست صحيحة — حاوِل ثانيةً</span>
                    )}
                  </p>
                )}
                <AnswerForm itemId={it.id} format={it.format} options={options} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Manual homework (from the paper textbook) */}
      {(manualHw ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className={h2}>واجباتي من الكتاب</h2>
          <ul className="flex flex-col gap-3">
            {(manualHw ?? []).map((h: any) => {
              const tFiles = (h.homework_files ?? []).filter((f: any) => f.kind !== "submission");
              const myFiles = (h.homework_files ?? []).filter((f: any) => f.kind === "submission");
              return (
                <li key={h.id} className={card}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">من الكتاب</span>
                    {h.status === "graded" ? (
                      <span className="font-bold text-leaf">مُصحَّح{h.score != null ? `: ${h.score}${h.max_score != null ? `/${h.max_score}` : ""}` : ""} ✓</span>
                    ) : h.status === "submitted" ? (
                      <span className="text-ink-soft">أُرسل ✓ — بانتظار التصحيح</span>
                    ) : (
                      <span className="text-rose-600">بانتظار حلّك</span>
                    )}
                  </div>
                  <p className="font-bold text-ink">{h.title}</p>
                  {h.instructions && <p className="text-sm text-ink-soft">{h.instructions}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tFiles.map((f: any) => {
                      const href = hwUrls.get(f.id);
                      return href ? <a key={f.id} href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">عرض الواجب ↓</a> : null;
                    })}
                    {myFiles.map((f: any) => {
                      const href = hwUrls.get(f.id);
                      return href ? <a key={f.id} href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-leaf/40 px-2.5 py-1 text-xs font-medium text-leaf">حلّي ↓</a> : null;
                    })}
                  </div>
                  {h.status === "graded" && h.feedback && <p className="mt-2 text-sm text-ink-soft"><span className="font-medium">ملاحظة المعلّمة:</span> {h.feedback}</p>}
                  {h.status === "assigned" && (
                    <form action={submitManualHomework} className="mt-3 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="manualHomeworkId" value={h.id} />
                      <input type="file" name="file" required accept="image/*" className="text-sm" />
                      <SubmitButton pendingText="جارٍ الرفع…" className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                        ارفع صورة حلّي
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
