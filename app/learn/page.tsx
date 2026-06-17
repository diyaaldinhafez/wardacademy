import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bloomStage } from "@/lib/progress";
import { FORMAT_LABELS, type ItemFormat } from "@/lib/items";
import { logout } from "@/app/studio/actions";
import { submitPlacement } from "./actions";
import AnswerForm from "@/components/learn/AnswerForm";
import SubmitButton from "@/components/studio/SubmitButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const objOf = (row: any) => (Array.isArray(row?.objectives) ? row.objectives[0] : row?.objectives) ?? {};

export default async function LearnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, objective_id, objectives(description, level)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const { data: subs } = await supabase
    .from("submissions")
    .select("item_id, is_correct, graded, created_at")
    .order("created_at", { ascending: false });

  const { data: prog } = await supabase
    .from("progress_records")
    .select("attempts, correct, completions, objectives(description, level)");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes")
    .order("scheduled_at");
  const { data: reports } = await supabase
    .from("session_reports")
    .select("session_id, summary, strengths, improve");
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
    const { data } = await admin
      .from("placement_questions")
      .select("id, prompt, content, position")
      .eq("placement_test_id", placement.id)
      .order("position");
    placementQuestions = data ?? [];
  }

  const { data: studyPlan } = await supabase
    .from("study_plans")
    .select("title, level, items")
    .eq("learner_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastByItem = new Map<string, { is_correct: boolean | null; graded: boolean }>();
  for (const s of (subs ?? []) as any[]) {
    if (!lastByItem.has(s.item_id)) lastByItem.set(s.item_id, { is_correct: s.is_correct, graded: s.graded });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Practice</h1>
          <p className="text-sm text-slate-500">{profile?.full_name ?? user.email}</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
            Sign out
          </button>
        </form>
      </header>

      {/* Placement test */}
      {placement?.status === "in_progress" && (
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-lg font-semibold">Placement test</h2>
          <p className="mb-4 text-sm text-slate-500">Answer these so we can find your level.</p>
          <form action={submitPlacement} className="flex flex-col gap-4">
            <input type="hidden" name="testId" value={placement.id} />
            {placementQuestions.map((q: any, idx: number) => {
              const options = (q.content?.options ?? []) as string[];
              return (
                <div key={q.id}>
                  <p className="font-medium text-slate-900">
                    {idx + 1}. {q.prompt}
                  </p>
                  <div className="mt-1 flex flex-col gap-1">
                    {options.map((o, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <input type="radio" name={`q_${q.id}`} value={o} required /> {o}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            <SubmitButton
              pendingText="Submitting…"
              className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Submit placement
            </SubmitButton>
          </form>
        </section>
      )}
      {placement?.status === "completed" && placement.suggested_level && (
        <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="text-lg font-semibold">Placement complete</h2>
          <p className="mt-1 text-sm text-slate-700">
            Suggested level: <span className="font-semibold text-emerald-700">{placement.suggested_level}</span>
          </p>
        </section>
      )}

      {/* Progress */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Your progress</h2>
        {(prog ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No progress yet — answer a few questions below.</p>
        )}
        <ul className="flex flex-col gap-2">
          {(prog ?? []).map((p: any, i: number) => {
            const o = objOf(p);
            const stage = bloomStage(p);
            return (
              <li key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-sm text-slate-800">
                  {o.level ? `${o.level} · ` : ""}
                  {o.description ?? "Objective"}
                </span>
                <span className="text-sm">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{stage.label}</span>
                  <span className="ml-2 text-slate-400">
                    {p.correct}/{p.attempts} correct
                    {p.completions ? ` · ${p.completions} practiced` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Study plan */}
      {studyPlan && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Your plan</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-900">{studyPlan.title}</p>
            <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
              {((studyPlan.items as any[]) ?? []).map((it, i) => (
                <li key={i}>
                  {it.level ? `${it.level} · ` : ""}
                  {it.description}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Sessions */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Your sessions</h2>
        {(sessions ?? []).length === 0 && <p className="text-sm text-slate-500">No sessions scheduled yet.</p>}
        <ul className="flex flex-col gap-2">
          {(sessions ?? []).map((s: any) => {
            const r = reportBySession.get(s.id);
            return (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-800">
                  {fmtUTC(s.scheduled_at)} · {s.duration_minutes} min
                </p>
                {r && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">
                    <p className="font-medium text-slate-700">Report</p>
                    <p className="text-slate-700">{r.summary}</p>
                    {r.strengths && (
                      <p className="text-slate-600">
                        <span className="font-medium">Strengths:</span> {r.strengths}
                      </p>
                    )}
                    {r.improve && (
                      <p className="text-slate-600">
                        <span className="font-medium">To improve:</span> {r.improve}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Practice */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Questions</h2>
        {(items ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No questions yet. Your teacher will add some soon.</p>
        )}
        <ul className="flex flex-col gap-3">
          {(items ?? []).map((it: any) => {
            const last = lastByItem.get(it.id);
            const options = (it.content?.options ?? []) as string[];
            return (
              <li key={it.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-1 text-xs text-slate-500">
                  {FORMAT_LABELS[it.format as ItemFormat] ?? it.format}
                </div>
                <p className="whitespace-pre-line font-medium text-slate-900">{it.prompt}</p>

                {last && (
                  <p className="mt-2 text-sm">
                    {!last.graded ? (
                      <span className="text-slate-500">Submitted ✓</span>
                    ) : last.is_correct ? (
                      <span className="font-medium text-emerald-700">Correct ✓</span>
                    ) : (
                      <span className="font-medium text-rose-600">Not quite — try again</span>
                    )}
                  </p>
                )}

                <AnswerForm itemId={it.id} format={it.format} options={options} />
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
