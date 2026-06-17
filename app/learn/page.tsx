import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bloomStage } from "@/lib/progress";
import { FORMAT_LABELS, type ItemFormat } from "@/lib/items";
import { logout } from "@/app/studio/actions";
import AnswerForm from "@/components/learn/AnswerForm";

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
