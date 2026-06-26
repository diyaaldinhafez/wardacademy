import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { type BloomStage } from "@/lib/skills";
import { FlowerProgress, UnitBloom as BloomUnit, ScopeChip } from "@/components/bloom/Bloom";
import { fetchStudentBloom } from "@/lib/progress/bloom";
import { submitPlacement, submitManualHomework, submitAssessment } from "./actions";
import AnswerForm from "@/components/learn/AnswerForm";
import SubmitButton from "@/components/studio/SubmitButton";
import WorkspaceHeader from "@/components/studio/WorkspaceHeader";
import VideoCall from "@/components/VideoCall";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: the child surface is English-PURE — UI text is forced to `en` regardless
// of the global LOCALE cookie. Educational content (question prompts/options, the
// catalog unit titles `title_ar`, plan/report/homework text written by the
// teacher) is NOT translated here — it comes from the curriculum/catalog/teacher.
const card = "rounded-2xl border border-brand-100 bg-white p-4 shadow-ward-1";
const h2 = "mb-3 text-lg font-bold text-ink";
const FORMATS = ["multiple_choice", "fill_blank", "true_false", "matching", "open", "audio"];

export default async function LearnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  // English-pure child surface: force the `en` locale for all UI text.
  const t = await getTranslations({ locale: "en", namespace: "learn" });
  const tc = await getTranslations({ locale: "en", namespace: "common" });
  const skillLabel = (sk: string) =>
    ["listening", "speaking", "reading", "writing"].includes(sk) ? tc(`skills.${sk}`) : sk;
  const fmtLabel = (f: string) => (FORMATS.includes(f) ? t(`homework.formats.${f}`) : f);
  const answerLabels = {
    trueLabel: t("answer.true"),
    falseLabel: t("answer.false"),
    placeholder: t("answer.placeholder"),
    audioHint: t("answer.audioHint"),
    audioDone: t("answer.audioDone"),
    send: t("answer.send"),
    sending: t("answer.sending"),
  };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, origin, objective_id, curriculum_objectives(descriptor_ar, level)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  const { data: subs } = await supabase
    .from("submissions")
    .select("item_id, is_correct, graded, created_at")
    .order("created_at", { ascending: false });
  const bloom = await fetchStudentBloom(supabase, user.id);
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

  // Unit hero + skill flower + garden path — all from the one shared roll-up.
  const currentUnit = bloom.startedUnits.find((u) => u.stage !== "bloom") ?? bloom.startedUnits[0] ?? null;
  const gardenUnits = bloom.startedUnits.map((u) => ({
    unit: u.title_ar, // educational content (catalog unit title) — left as-is until title_en exists
    status: (u.stage === "bloom" ? "mastered" : "current") as "mastered" | "current" | "upcoming",
    stage: u.stage as BloomStage,
  }));

  return (
    <main lang="en" dir="ltr" className="mx-auto max-w-2xl px-5 py-10">
      <WorkspaceHeader title={t("header.title")} subtitle={profile?.full_name ?? user.email ?? ""} />

      {/* A ready unit assessment (takes over until taken) */}
      {readyAssessment && (
        <section className={`mb-10 ${card}`}>
          {/* {unit} is the catalog unit title (educational content) */}
          <h2 className="mb-1 text-lg font-bold text-ink">{t("assessment.heading", { unit: readyAssessment.unit })}</h2>
          <p className="mb-4 text-sm text-ink-soft">{t("assessment.intro")}</p>
          <form action={submitAssessment} className="flex flex-col gap-4">
            <input type="hidden" name="assessmentId" value={readyAssessment.id} />
            {assessmentQuestions.map((q: any, idx: number) => (
              <div key={q.id}>
                {/* q.prompt + options: educational content (English, from the question bank) */}
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
            <SubmitButton pendingText={t("assessment.sending")} className="inline-flex h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-ward-1 hover:bg-brand-600 disabled:opacity-60">
              {t("assessment.submit")}
            </SubmitButton>
          </form>
        </section>
      )}

      {/* Placement (takes over when active) */}
      {placement?.status === "in_progress" && (
        <section className={`mb-10 ${card}`}>
          <h2 className="mb-1 text-lg font-bold text-ink">{t("placement.heading")}</h2>
          <p className="mb-4 text-sm text-ink-soft">{t("placement.intro")}</p>
          <form action={submitPlacement} className="flex flex-col gap-4">
            <input type="hidden" name="testId" value={placement.id} />
            {placementQuestions.map((q: any, idx: number) => (
              <div key={q.id}>
                {/* q.prompt + options: educational content (English, from the question bank) */}
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
            <SubmitButton pendingText={t("placement.sending")} className="inline-flex h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-ward-1 hover:bg-brand-600 disabled:opacity-60">
              {t("placement.submit")}
            </SubmitButton>
          </form>
        </section>
      )}
      {placement?.status === "completed" && placement.suggested_level && (
        <section className="mb-8 rounded-2xl border border-leaf/30 bg-leaf/5 p-4 text-sm text-ink">
          {t("placement.result")} <span className="font-bold text-leaf">{placement.suggested_level}</span>
        </section>
      )}

      {/* Daily hero: the current unit bud -> balloon -> bloom */}
      {currentUnit && (
        <section className="mb-8">
          <h2 className={h2}>{t("unit.heading")}</h2>
          <div className="flex items-center gap-4 rounded-2xl p-5 text-white shadow-ward-2" style={{ background: "var(--grad-bloom, linear-gradient(135deg,#9F7DE7,#6840BD))" }}>
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(41,23,78,0.26)" }}>
              <BloomUnit stage={currentUnit.stage} size={60} pop={currentUnit.stage === "bloom"} />
            </div>
            <div className="min-w-0 flex-1">
              {/* unit title: educational content (catalog) */}
              <p className="text-base font-extrabold leading-tight">{currentUnit.title_ar}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--ward-purple-100)" }}>{t(`unit.stage.${currentUnit.stage}`)}</p>
              <p className="mt-1 text-xs font-bold" style={{ color: "var(--ward-purple-100)", fontVariantNumeric: "tabular-nums" }}>
                {t("unit.goalsProgress", { done: currentUnit.assessedCount, total: currentUnit.total, value: currentUnit.value.toFixed(1) })}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* The garden path: the plan's units as a journey */}
      {gardenUnits.length > 0 && (
        <section className="mb-8">
          <h2 className={h2}>{t("path.heading")}</h2>
          <div className={card}>
            <ul className="flex flex-col">
              {gardenUnits.map((g, i) => (
                <li key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < gardenUnits.length - 1 ? "1px solid var(--ink-100)" : "none" }}>
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full" style={{ background: g.status === "mastered" ? "var(--ward-purple-50)" : g.status === "current" ? "#fff" : "var(--ink-100)", border: g.status === "current" ? "2px solid var(--brand)" : "2px solid transparent" }}>
                    <BloomUnit stage={g.stage} size={34} />
                  </div>
                  <div className="flex-1">
                    {/* unit title: educational content (catalog) */}
                    <p className="text-sm font-bold" style={{ color: g.status === "upcoming" ? "var(--text-muted)" : "var(--text-strong)" }}>{g.unit}</p>
                    <p className="text-xs text-ink-soft">{t(`path.status.${g.status}`)}</p>
                  </div>
                  {g.status === "current" ? <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--apricot-100, #ffeedc)", color: "var(--apricot-600, #c97a2b)" }}>{t("path.now")}</span> : g.status === "mastered" ? <span className="text-leaf">✓</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* The skill flower (slower snapshot) */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-bold text-ink">{t("flower.heading")}</h2>
          {studyPlan?.scope_label && <ScopeChip>{studyPlan.scope_label}</ScopeChip>}
        </div>
        <div className={card}>
          <div className="flex items-center gap-4">
            <FlowerProgress size={104} skills={bloom.skills.map((s) => ({ label: skillLabel(s.skill), value: s.fraction, detail: `${s.value.toFixed(1)}/10` }))} />
            <p className="flex-1 text-sm text-ink-soft" style={{ lineHeight: 1.8 }}>{t("flower.blurb")}</p>
          </div>
        </div>
      </section>

      {/* Study plan */}
      {studyPlan && (
        <section className="mb-8">
          <h2 className={h2}>{t("plan.heading")}</h2>
          <div className={card}>
            {/* plan title + lesson descriptions: educational content (teacher-authored) */}
            <p className="font-bold text-ink">{studyPlan.title}</p>
            <ol className="mt-2 list-decimal pl-5 text-sm text-ink-soft">
              {((studyPlan.items as any[]) ?? []).map((it, i) => (
                <li key={i}>{it.level ? `${it.level} · ` : ""}{it.description}</li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Sessions */}
      <section className="mb-8">
        <h2 className={h2}>{t("sessions.heading")}</h2>
        {(sessions ?? []).length === 0 && <p className="text-sm text-ink-soft">{t("sessions.empty")}</p>}
        <ul className="flex flex-col gap-2">
          {(sessions ?? []).map((s: any) => {
            const r = reportBySession.get(s.id);
            return (
              <li key={s.id} className={card}>
                <p className="text-sm font-medium text-ink">{fmtUTC(s.scheduled_at)} · {t("sessions.minutes", { n: s.duration_minutes })}</p>
                <div className="mt-2"><VideoCall sessionId={s.id} label={t("sessions.join")} /></div>
                {r && (
                  <div className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">
                    <p className="font-bold text-brand-700">{t("sessions.report.title")}</p>
                    {/* report text: teacher/AI content */}
                    <p className="text-ink">{r.summary}</p>
                    {r.strengths && <p className="text-ink-soft"><span className="font-medium">{t("sessions.report.strengths")}</span> {r.strengths}</p>}
                    {r.improve && <p className="text-ink-soft"><span className="font-medium">{t("sessions.report.improve")}</span> {r.improve}</p>}
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
          <h2 className={h2}>{t("results.heading")}</h2>
          <ul className="flex flex-col gap-3">
            {(doneAssessments ?? []).map((a: any) => {
              const result = (a.result ?? {}) as Record<string, { correct: number; total: number }>;
              const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
              return (
                <li key={a.id} className={card}>
                  <div className="flex items-center justify-between gap-2">
                    {/* unit/test title: educational content */}
                    <p className="font-bold text-ink">{a.unit ?? a.title}</p>
                    <span className="flex-shrink-0 rounded-full bg-leaf/10 px-2.5 py-0.5 text-sm font-bold text-leaf">{a.score}/{a.max_score} · {pct}%</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {Object.entries(result).filter(([sk]) => ["listening", "speaking", "reading", "writing"].includes(sk)).map(([sk, v]) => {
                      const p = v.total ? Math.round((v.correct / v.total) * 100) : 0;
                      return (
                        <li key={sk} className="flex items-center gap-2 text-sm">
                          <span className="w-20 flex-shrink-0 text-ink">{skillLabel(sk)}</span>
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
        <h2 className={h2}>{t("homework.heading")}</h2>
        {(items ?? []).length === 0 && <p className="text-sm text-ink-soft">{t("homework.empty")}</p>}
        <ul className="flex flex-col gap-3">
          {(items ?? []).map((it: any) => {
            const last = lastByItem.get(it.id);
            const options = (it.content?.options ?? []) as string[];
            return (
              <li key={it.id} className={card}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">{fmtLabel(it.format)}</span>
                  <span className="inline-flex items-center gap-1 text-leaf">{t("homework.approved")}</span>
                </div>
                {/* item prompt: educational content (English, from the item bank) */}
                <p className="whitespace-pre-line font-medium text-ink" dir="ltr">{it.prompt}</p>
                {last && (
                  <p className="mt-2 text-sm">
                    {!last.graded ? (
                      <span className="text-ink-soft">{t("homework.sent")}</span>
                    ) : last.is_correct ? (
                      <span className="font-bold text-leaf">{t("homework.correct")}</span>
                    ) : (
                      <span className="font-bold text-rose-600">{t("homework.tryAgain")}</span>
                    )}
                  </p>
                )}
                <AnswerForm itemId={it.id} format={it.format} options={options} labels={answerLabels} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Manual homework (from the paper textbook) */}
      {(manualHw ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className={h2}>{t("bookHomework.heading")}</h2>
          <ul className="flex flex-col gap-3">
            {(manualHw ?? []).map((h: any) => {
              const tFiles = (h.homework_files ?? []).filter((f: any) => f.kind !== "submission");
              const myFiles = (h.homework_files ?? []).filter((f: any) => f.kind === "submission");
              return (
                <li key={h.id} className={card}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">{t("bookHomework.tag")}</span>
                    {h.status === "graded" ? (
                      <span className="font-bold text-leaf">{t("bookHomework.checked")}{h.score != null ? `: ${h.score}${h.max_score != null ? `/${h.max_score}` : ""}` : ""} ✓</span>
                    ) : h.status === "submitted" ? (
                      <span className="text-ink-soft">{t("bookHomework.waitingCheck")}</span>
                    ) : (
                      <span className="text-rose-600">{t("bookHomework.waitingYou")}</span>
                    )}
                  </div>
                  {/* homework title + instructions + feedback: teacher-authored content */}
                  <p className="font-bold text-ink">{h.title}</p>
                  {h.instructions && <p className="text-sm text-ink-soft">{h.instructions}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tFiles.map((f: any) => {
                      const href = hwUrls.get(f.id);
                      return href ? <a key={f.id} href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">{t("bookHomework.view")}</a> : null;
                    })}
                    {myFiles.map((f: any) => {
                      const href = hwUrls.get(f.id);
                      return href ? <a key={f.id} href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-leaf/40 px-2.5 py-1 text-xs font-medium text-leaf">{t("bookHomework.myAnswer")}</a> : null;
                    })}
                  </div>
                  {h.status === "graded" && h.feedback && <p className="mt-2 text-sm text-ink-soft"><span className="font-medium">{t("bookHomework.teacherNote")}</span> {h.feedback}</p>}
                  {h.status === "assigned" && (
                    <form action={submitManualHomework} className="mt-3 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="manualHomeworkId" value={h.id} />
                      <input type="file" name="file" required accept="image/*" className="text-sm" />
                      <SubmitButton pendingText={t("bookHomework.uploading")} className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                        {t("bookHomework.upload")}
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
