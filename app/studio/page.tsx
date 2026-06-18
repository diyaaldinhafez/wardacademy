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
  logout,
} from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ScheduleForm from "@/components/studio/ScheduleForm";
import { bloomStage } from "@/lib/progress";
import { fmtUTC } from "@/lib/datetime";
import Onboarding from "./onboarding";

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
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ward Academy Studio</h1>
          <p className="text-sm text-slate-500">
            {profile?.full_name ?? user.email} · {(profile?.roles ?? []).join(", ") || "no role"}
          </p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
            Sign out
          </button>
        </form>
      </header>

      {!isInstructor && (
        <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          This account is not an instructor, so generation is disabled.
        </p>
      )}

      {isInstructor && <Onboarding />}

      {/* Objectives → generate */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Objectives</h2>
        <ul className="flex flex-col gap-3">
          {(objectives ?? []).map((o) => (
            <li key={o.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {o.track.toUpperCase()}
                  {o.level ? ` · ${o.level}` : ""}
                </span>
                <span className="text-slate-900">{o.description}</span>
              </div>
              {isInstructor && (
                <form action={generateDraft} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="objectiveId" value={o.id} />
                  <select name="format" defaultValue="multiple_choice" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    {ITEM_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <select name="difficulty" defaultValue="easy" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <SubmitButton
                    pendingText="Generating…"
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Generate draft
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
          Drafts to review <span className="text-slate-400">({drafts.length})</span>
        </h2>
        {drafts.length === 0 && <p className="text-sm text-slate-500">No drafts yet.</p>}
        <ul className="flex flex-col gap-3">
          {drafts.map((it) => (
            <li key={it.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <ItemBody it={it} />
              <div className="mt-3 flex gap-2">
                <form action={approveItem}>
                  <input type="hidden" name="itemId" value={it.id} />
                  <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    Approve
                  </SubmitButton>
                </form>
                <form action={rejectItem}>
                  <input type="hidden" name="itemId" value={it.id} />
                  <SubmitButton className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60">
                    Reject
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Approved */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Approved <span className="text-slate-400">({approved.length})</span>
        </h2>
        {approved.length === 0 && <p className="text-sm text-slate-500">Nothing approved yet.</p>}
        <ul className="flex flex-col gap-3">
          {approved.map((it) => {
            const assigned = assigneesByItem.get(it.id) ?? [];
            return (
              <li key={it.id} className="rounded-xl border border-emerald-200 bg-white p-4">
                <ItemBody it={it} />
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">
                    Assigned to:{" "}
                    {assigned.length
                      ? assigned.map((id) => learnerName.get(id) ?? id).join(", ")
                      : "no one yet"}
                  </p>
                  {learners.length > 0 && (
                    <form action={assignItem} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="itemId" value={it.id} />
                      <select
                        name="learnerId"
                        defaultValue=""
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="" disabled>
                          Choose a student…
                        </option>
                        {learners.map((l) => (
                          <option key={l.id} value={l.id}>
                            {(l.full_name as string) ?? l.id}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        pendingText="Assigning…"
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-60"
                      >
                        Assign
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
        <h2 className="mb-3 text-lg font-semibold">Sessions</h2>
        {learnersForForm.length > 0 ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Schedule a session</p>
            <ScheduleForm learners={learnersForForm} />
            <p className="mt-2 text-xs text-slate-400">Entered in your local time, stored and shown as UTC.</p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Add a student first to schedule a session.</p>
        )}
        {(sessions ?? []).length === 0 && <p className="text-sm text-slate-500">No sessions yet.</p>}
        <ul className="flex flex-col gap-3">
          {(sessions ?? []).map((s) => {
            const report = Array.isArray(s.session_reports) ? s.session_reports[0] : s.session_reports;
            return (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{learnerName.get(s.learner_id) ?? s.learner_id}</p>
                    <p className="text-sm text-slate-500">
                      {fmtUTC(s.scheduled_at)} · {s.duration_minutes} min
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.status}</span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {!report && (
                    <div className="flex flex-col gap-3">
                      <form action={draftReportWithAI}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <SubmitButton pendingText="Drafting…" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60">
                          Draft report with AI
                        </SubmitButton>
                      </form>
                      <form action={createReport} className="flex flex-col gap-2">
                        <input type="hidden" name="sessionId" value={s.id} />
                        <p className="text-sm font-medium text-slate-700">…or write it</p>
                        <textarea name="summary" required rows={2} placeholder="Summary" className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        <input name="strengths" placeholder="Strengths (optional)" className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        <input name="improve" placeholder="To improve (optional)" className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        <SubmitButton pendingText="Saving…" className="self-start rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                          Save report (draft)
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                  {report && report.status === "draft" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-amber-700">Draft — edit if needed, then approve</p>
                      <form action={updateReport} className="flex flex-col gap-2">
                        <input type="hidden" name="reportId" value={report.id} />
                        <textarea name="summary" required rows={2} defaultValue={report.summary ?? ""} className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        <input name="strengths" defaultValue={report.strengths ?? ""} placeholder="Strengths" className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        <input name="improve" defaultValue={report.improve ?? ""} placeholder="To improve" className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        <SubmitButton pendingText="Saving…" className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60">
                          Save edits
                        </SubmitButton>
                      </form>
                      <form action={approveReport}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <SubmitButton pendingText="Approving…" className="self-start rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                          Approve report
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                  {report && report.status === "approved" && (
                    <p className="text-sm text-emerald-700">Report approved — visible to the family.</p>
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
          Students &amp; progress <span className="text-slate-400">({learners.length})</span>
        </h2>
        {learners.length === 0 && <p className="text-sm text-slate-500">No students yet.</p>}
        <ul className="flex flex-col gap-3">
          {learners.map((l) => {
            const rows = progByLearner.get(l.id) ?? [];
            const pl = placementByLearner.get(l.id);
            const plan = planByLearner.get(l.id);
            return (
              <li key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{l.full_name ?? l.id}</p>
                <div className="mb-2 mt-1 flex items-center gap-2 text-xs">
                  {pl?.status === "completed" && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      Placement: {pl.suggested_level}
                    </span>
                  )}
                  {pl?.status === "in_progress" && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                      Placement in progress
                    </span>
                  )}
                  {pl?.status !== "in_progress" && (
                    <form action={startPlacement}>
                      <input type="hidden" name="learnerId" value={l.id} />
                      <SubmitButton
                        pendingText="Generating…"
                        className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-60"
                      >
                        {pl?.status === "completed" ? "Re-run placement" : "Start placement"}
                      </SubmitButton>
                    </form>
                  )}
                </div>
                {plan ? (
                  <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-700">
                      Plan: {plan.title} {plan.status === "draft" ? "(draft)" : "✓"}
                    </p>
                    <ol className="mt-1 list-decimal pl-4 text-xs text-slate-600">
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
                          <SubmitButton pendingText="Approving…" className="rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                            Approve plan
                          </SubmitButton>
                        </form>
                      )}
                      {plan.status === "approved" && (
                        <form action={materializePlanObjectives}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <SubmitButton pendingText="Adding…" className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-60">
                            Add objectives
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <form action={startPlan} className="mb-2">
                    <input type="hidden" name="learnerId" value={l.id} />
                    <SubmitButton pendingText="Generating…" className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-60">
                      Generate plan
                    </SubmitButton>
                  </form>
                )}
                {rows.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {rows.map((r, i) => {
                      const o = objText(r.objectives);
                      const stage = bloomStage(r);
                      return (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">
                            {o.level ? `${o.level} · ` : ""}
                            {o.description ?? "Objective"}
                          </span>
                          <span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{stage.label}</span>
                            <span className="ml-2 text-slate-400">
                              {r.correct}/{r.attempts}
                              {r.completions ? ` · ${r.completions} practiced` : ""}
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
      <div className="mb-1 flex gap-2 text-xs text-slate-500">
        <span className="rounded bg-slate-100 px-1.5 py-0.5">{FORMAT_LABELS[it.format as keyof typeof FORMAT_LABELS] ?? it.format}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5">{it.difficulty}</span>
      </div>
      <p className="font-medium whitespace-pre-line text-slate-900">{it.prompt}</p>
      {Array.isArray(content.options) && (
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
          {content.options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ul>
      )}
      {answer !== undefined && answer !== null && (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-emerald-700">Answer:</span>{" "}
          {formatAnswer(answer, content.options)}
        </p>
      )}
      {rubric && (
        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
          <span className="font-semibold">Rubric:</span> {rubric}
        </p>
      )}
      {explanation && (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-semibold">Why:</span> {explanation}
        </p>
      )}
    </div>
  );
}
