import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ITEM_FORMATS, DIFFICULTIES, FORMAT_LABELS } from "@/lib/items";
import {
  generateDraft,
  approveItem,
  rejectItem,
  assignItem,
  createReport,
  approveReport,
  draftReportWithAI,
  updateReport,
  startPlacement,
  startPlan,
  approvePlan,
  materializePlanObjectives,
} from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ScheduleForm from "@/components/studio/ScheduleForm";
import { bloomStage } from "@/lib/progress";
import { fmtUTC } from "@/lib/datetime";
import Onboarding from "./onboarding";
import WorkspaceHeader from "@/components/studio/WorkspaceHeader";

const AR_STAGE: Record<string, string> = {
  "Not started": "لم يبدأ بعد",
  Practiced: "تدرّب",
  Sprouting: "بذرة",
  Budding: "برعم",
  Growing: "ينمو",
  Blooming: "متفتّح 🌸",
};

type EmbeddedObjective = { description?: string; level?: string };
type ProgRow = {
  learner_id: string;
  attempts: number;
  correct: number;
  completions: number;
  objectives: EmbeddedObjective | EmbeddedObjective[] | null;
};
const objText = (o: ProgRow["objectives"]): EmbeddedObjective => (Array.isArray(o) ? o[0] : o) ?? {};

type PlanItem = { description: string; level: string };
type StudyPlanRow = {
  id: string;
  learner_id: string;
  title: string;
  level: string | null;
  items: PlanItem[];
  status: string;
};

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roles")
    .eq("id", user.id)
    .single();

  const isInstructor = (profile?.roles ?? []).includes("instructor");

  const { data: objectives } = await supabase
    .from("objectives")
    .select("id, track, level, description")
    .order("created_at");

  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, status, objective_id, item_keys(answer, explanation, rubric)")
    .order("created_at", { ascending: false });

  const drafts = (items ?? []).filter((i) => i.status === "draft");
  const approved = (items ?? []).filter((i) => i.status === "approved");

  // Students & their progress (instructor sees the whole tenant).
  const { data: people } = await supabase.from("profiles").select("id, full_name, roles");
  const learners = (people ?? []).filter((p) => ((p.roles as string[]) ?? []).includes("learner"));
  const { data: prog } = await supabase
    .from("progress_records")
    .select("learner_id, attempts, correct, completions, objectives(description, level)");
  const progByLearner = new Map<string, ProgRow[]>();
  for (const r of (prog ?? []) as ProgRow[]) {
    const arr = progByLearner.get(r.learner_id) ?? [];
    arr.push(r);
    progByLearner.set(r.learner_id, arr);
  }

  const { data: assignments } = await supabase.from("assignments").select("item_id, learner_id");
  const assigneesByItem = new Map<string, string[]>();
  for (const a of (assignments ?? []) as { item_id: string; learner_id: string }[]) {
    const arr = assigneesByItem.get(a.item_id) ?? [];
    arr.push(a.learner_id);
    assigneesByItem.set(a.item_id, arr);
  }
  const learnerName = new Map<string, string>();
  for (const l of learners) learnerName.set(l.id, (l.full_name as string) ?? l.id);
  const learnersForForm = learners.map((l) => ({ id: l.id, name: (l.full_name as string) ?? l.id }));

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, learner_id, session_reports(id, status, summary, strengths, improve)")
    .order("scheduled_at", { ascending: true });

  const { data: placements } = await supabase
    .from("placement_tests")
    .select("learner_id, status, suggested_level, created_at")
    .order("created_at", { ascending: false });
  const placementByLearner = new Map<string, { status: string; suggested_level: string | null }>();
  for (const pl of (placements ?? []) as { learner_id: string; status: string; suggested_level: string | null }[]) {
    if (!placementByLearner.has(pl.learner_id)) placementByLearner.set(pl.learner_id, pl);
  }

  const { data: studyPlans } = await supabase
    .from("study_plans")
    .select("id, learner_id, title, level, items, status, created_at")
    .order("created_at", { ascending: false });
  const planByLearner = new Map<string, StudyPlanRow>();
  for (const sp of (studyPlans ?? []) as StudyPlanRow[]) {
    if (!planByLearner.has(sp.learner_id)) planByLearner.set(sp.learner_id, sp);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <WorkspaceHeader title="استوديو المعلّم" subtitle={profile?.full_name ?? user.email ?? ""} />

      {!isInstructor && (
        <p className="mb-6 rounded-2xl bg-amber/15 p-3 text-sm text-brand-900">
          هذا الحساب ليس معلّماً، فالتوليد معطّل.
        </p>
      )}

      {isInstructor && <Onboarding />}

      {/* Objectives → generate */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-ink">الأهداف</h2>
        <ul className="flex flex-col gap-3">
          {(objectives ?? []).map((o) => (
            <li key={o.id} className="rounded-xl border border-brand-100 bg-white p-4">
              <div className="mb-3">
                <span className="mr-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-ink-soft">
                  {o.track.toUpperCase()}
                  {o.level ? ` · ${o.level}` : ""}
                </span>
                <span className="text-ink">{o.description}</span>
              </div>
              {isInstructor && (
                <form action={generateDraft} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="objectiveId" value={o.id} />
                  <select name="format" defaultValue="multiple_choice" className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm">
                    {ITEM_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <select name="difficulty" defaultValue="easy" className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm">
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <SubmitButton
                    pendingText="جارٍ التوليد…"
                    className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    ولّد مسودّة
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Drafts → review */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          مسودّات للمراجعة <span className="text-ink-soft">({drafts.length})</span>
        </h2>
        {drafts.length === 0 && <p className="text-sm text-ink-soft">لا مسودّات بعد.</p>}
        <ul className="flex flex-col gap-3">
          {drafts.map((it) => (
            <li key={it.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <ItemBody it={it} />
              <div className="mt-3 flex gap-2">
                <form action={approveItem}>
                  <input type="hidden" name="itemId" value={it.id} />
                  <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    اعتمِد
                  </SubmitButton>
                </form>
                <form action={rejectItem}>
                  <input type="hidden" name="itemId" value={it.id} />
                  <SubmitButton className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm hover:bg-brand-50 disabled:opacity-60">
                    ارفض
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* اعتمِدd */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          المعتمَدة <span className="text-ink-soft">({approved.length})</span>
        </h2>
        {approved.length === 0 && <p className="text-sm text-ink-soft">لا شيء معتمَدٌ بعد.</p>}
        <ul className="flex flex-col gap-3">
          {approved.map((it) => {
            const assigned = assigneesByItem.get(it.id) ?? [];
            return (
              <li key={it.id} className="rounded-xl border border-emerald-200 bg-white p-4">
                <ItemBody it={it} />
                <div className="mt-3 border-t border-brand-100 pt-3">
                  <p className="text-xs text-ink-soft">
                    مُسنَدٌ إلى:{" "}
                    {assigned.length
                      ? assigned.map((id) => learnerName.get(id) ?? id).join(", ")
                      : "لا أحد بعد"}
                  </p>
                  {learners.length > 0 && (
                    <form action={assignItem} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="itemId" value={it.id} />
                      <select
                        name="learnerId"
                        defaultValue=""
                        className="rounded-lg border border-brand-200 px-2 py-1 text-sm"
                      >
                        <option value="" disabled>
                          اختر طالباً…
                        </option>
                        {learners.map((l) => (
                          <option key={l.id} value={l.id}>
                            {(l.full_name as string) ?? l.id}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        pendingText="جارٍ الإسناد…"
                        className="rounded-lg border border-brand-200 px-3 py-1 text-sm hover:bg-brand-50 disabled:opacity-60"
                      >
                        أسنِد
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Sessions */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-ink">الجلسات</h2>
        {learnersForForm.length > 0 ? (
          <div className="mb-4 rounded-xl border border-brand-100 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-ink">جدوِل جلسة</p>
            <ScheduleForm learners={learnersForForm} />
            <p className="mt-2 text-xs text-ink-soft">يُدخَل بتوقيتك المحلّي ويُعرَض UTC.</p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-ink-soft">أضِف طالباً أولاً لجدولة جلسة.</p>
        )}
        {(sessions ?? []).length === 0 && <p className="text-sm text-ink-soft">لا جلسات بعد.</p>}
        <ul className="flex flex-col gap-3">
          {(sessions ?? []).map((s) => {
            const report = Array.isArray(s.session_reports) ? s.session_reports[0] : s.session_reports;
            return (
              <li key={s.id} className="rounded-xl border border-brand-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{learnerName.get(s.learner_id) ?? s.learner_id}</p>
                    <p className="text-sm text-ink-soft">
                      {fmtUTC(s.scheduled_at)} · {s.duration_minutes} دقيقة
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-ink-soft">{s.status}</span>
                </div>
                <div className="mt-3 border-t border-brand-100 pt-3">
                  {!report && (
                    <div className="flex flex-col gap-3">
                      <form action={draftReportWithAI}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <SubmitButton pendingText="جارٍ التوليد…" className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium hover:bg-brand-50 disabled:opacity-60">
                          ولّد التقرير بالذكاء
                        </SubmitButton>
                      </form>
                      <form action={createReport} className="flex flex-col gap-2">
                        <input type="hidden" name="sessionId" value={s.id} />
                        <p className="text-sm font-medium text-ink">…أو اكتبه يدوياً</p>
                        <textarea name="summary" required rows={2} placeholder="ملخّص" className="rounded border border-brand-200 px-2 py-1 text-sm" />
                        <input name="strengths" placeholder="نقاط القوة (اختياري)" className="rounded border border-brand-200 px-2 py-1 text-sm" />
                        <input name="improve" placeholder="للتحسين (اختياري)" className="rounded border border-brand-200 px-2 py-1 text-sm" />
                        <SubmitButton pendingText="جارٍ الحفظ…" className="self-start rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                          احفظ التقرير (مسودّة)
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                  {report && report.status === "draft" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-amber-700">مسودّة — عدّل ثمّ اعتمِد</p>
                      <form action={updateReport} className="flex flex-col gap-2">
                        <input type="hidden" name="reportId" value={report.id} />
                        <textarea name="summary" required rows={2} defaultValue={report.summary ?? ""} className="rounded border border-brand-200 px-2 py-1 text-sm" />
                        <input name="strengths" defaultValue={report.strengths ?? ""} placeholder="نقاط القوة" className="rounded border border-brand-200 px-2 py-1 text-sm" />
                        <input name="improve" defaultValue={report.improve ?? ""} placeholder="للتحسين" className="rounded border border-brand-200 px-2 py-1 text-sm" />
                        <SubmitButton pendingText="جارٍ الحفظ…" className="self-start rounded-lg border border-brand-200 px-3 py-1.5 text-sm hover:bg-brand-50 disabled:opacity-60">
                          احفظ التعديلات
                        </SubmitButton>
                      </form>
                      <form action={approveReport}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <SubmitButton pendingText="جارٍ الاعتماد…" className="self-start rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                          اعتمِد التقرير
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                  {report && report.status === "approved" && (
                    <p className="text-sm text-emerald-700">اعتُمِد التقرير — ظاهرٌ للعائلة.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Students & progress */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          الطلاب والتقدّم <span className="text-ink-soft">({learners.length})</span>
        </h2>
        {learners.length === 0 && <p className="text-sm text-ink-soft">لا طلاب بعد.</p>}
        <ul className="flex flex-col gap-3">
          {learners.map((l) => {
            const rows = progByLearner.get(l.id) ?? [];
            const pl = placementByLearner.get(l.id);
            const plan = planByLearner.get(l.id);
            return (
              <li key={l.id} className="rounded-xl border border-brand-100 bg-white p-4">
                <p className="font-medium text-ink">{l.full_name ?? l.id}</p>
                <div className="mb-2 mt-1 flex items-center gap-2 text-xs">
                  {pl?.status === "completed" && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      التحديد: {pl.suggested_level}
                    </span>
                  )}
                  {pl?.status === "in_progress" && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                      التحديد جارٍ
                    </span>
                  )}
                  {pl?.status !== "in_progress" && (
                    <form action={startPlacement}>
                      <input type="hidden" name="learnerId" value={l.id} />
                      <SubmitButton
                        pendingText="جارٍ التوليد…"
                        className="rounded-lg border border-brand-200 px-2 py-0.5 text-xs hover:bg-brand-50 disabled:opacity-60"
                      >
                        {pl?.status === "completed" ? "أعِد التحديد" : "ابدأ التحديد"}
                      </SubmitButton>
                    </form>
                  )}
                </div>
                {plan ? (
                  <div className="mb-2 rounded-lg border border-brand-100 bg-brand-50 p-2">
                    <p className="text-xs font-medium text-ink">
                      الخطّة: {plan.title} {plan.status === "draft" ? "(مسودّة)" : "✓"}
                    </p>
                    <ol className="mt-1 list-decimal pl-4 text-xs text-ink-soft">
                      {plan.items.map((it, i) => (
                        <li key={i}>
                          {it.level ? `${it.level} · ` : ""}
                          {it.description}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-2 flex gap-2">
                      {plan.status === "draft" && (
                        <form action={approvePlan}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <SubmitButton pendingText="جارٍ الاعتماد…" className="rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                            اعتمِد الخطّة
                          </SubmitButton>
                        </form>
                      )}
                      {plan.status === "approved" && (
                        <form action={materializePlanObjectives}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <SubmitButton pendingText="جارٍ الإضافة…" className="rounded-lg border border-brand-200 px-2 py-0.5 text-xs hover:bg-brand-50 disabled:opacity-60">
                            أضِف الأهداف
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <form action={startPlan} className="mb-2">
                    <input type="hidden" name="learnerId" value={l.id} />
                    <SubmitButton pendingText="جارٍ التوليد…" className="rounded-lg border border-brand-200 px-2 py-0.5 text-xs hover:bg-brand-50 disabled:opacity-60">
                      ولّد خطّة
                    </SubmitButton>
                  </form>
                )}
                {rows.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-soft">لا نشاط بعد.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {rows.map((r, i) => {
                      const o = objText(r.objectives);
                      const stage = bloomStage(r);
                      return (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-ink">
                            {o.level ? `${o.level} · ` : ""}
                            {o.description ?? "هدف"}
                          </span>
                          <span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{AR_STAGE[stage.label] ?? stage.label}</span>
                            <span className="ml-2 text-ink-soft">
                              {r.correct}/{r.attempts}
                              {r.completions ? ` · ${r.completions} تدريب` : ""}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Resolve an answer to readable text: a numeric index points into options.
function formatAnswer(answer: unknown, options?: string[]): string {
  if (typeof answer === "number") return options?.[answer] ?? String(answer);
  if (typeof answer === "string" || typeof answer === "boolean") return String(answer);
  if (Array.isArray(answer)) {
    return answer
      .map((a) => (typeof a === "number" ? (options?.[a] ?? String(a)) : String(a)))
      .join(", ");
  }
  return JSON.stringify(answer);
}

function ItemBody({ it }: { it: any }) {
  const content = (it.content ?? {}) as { options?: string[] };
  // item_keys (answer/explanation/rubric) — instructor-only, may be array or object
  const keys = (Array.isArray(it.item_keys) ? it.item_keys[0] : it.item_keys) ?? {};
  const answer = keys.answer;
  const explanation: string | undefined = keys.explanation ?? undefined;
  const rubric: string | undefined = keys.rubric ?? undefined;
  return (
    <div>
      <div className="mb-1 flex gap-2 text-xs text-ink-soft">
        <span className="rounded bg-brand-50 px-1.5 py-0.5">{FORMAT_LABELS[it.format as keyof typeof FORMAT_LABELS] ?? it.format}</span>
        <span className="rounded bg-brand-50 px-1.5 py-0.5">{it.difficulty}</span>
      </div>
      <p className="font-medium whitespace-pre-line text-ink">{it.prompt}</p>
      {Array.isArray(content.options) && (
        <ul className="mt-2 list-disc pl-5 text-sm text-ink">
          {content.options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ul>
      )}
      {answer !== undefined && answer !== null && (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-emerald-700">الإجابة:</span>{" "}
          {formatAnswer(answer, content.options)}
        </p>
      )}
      {rubric && (
        <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">
          <span className="font-semibold">سلّم التصحيح:</span> {rubric}
        </p>
      )}
      {explanation && (
        <p className="mt-1 text-sm text-ink-soft">
          <span className="font-semibold">السبب:</span> {explanation}
        </p>
      )}
    </div>
  );
}
