import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bloomStage } from "@/lib/progress";
import { logout } from "@/app/studio/actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
const first = (x: any) => (Array.isArray(x) ? x[0] : x) ?? {};

export default async function GuardianPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  // Read-only: the guardian's children (RLS scopes to their own links).
  const { data: children } = await supabase
    .from("guardianships")
    .select("learner_id, consent_granted, profiles!guardianships_learner_id_fkey(full_name)");

  const { data: prog } = await supabase
    .from("progress_records")
    .select("learner_id, attempts, correct, completions, objectives(description, level)");

  const progByLearner = new Map<string, any[]>();
  for (const r of (prog ?? []) as any[]) {
    const arr = progByLearner.get(r.learner_id) ?? [];
    arr.push(r);
    progByLearner.set(r.learner_id, arr);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your children</h1>
          <p className="text-sm text-slate-500">{profile?.full_name ?? user.email}</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
            Sign out
          </button>
        </form>
      </header>

      {(children ?? []).length === 0 && <p className="text-sm text-slate-500">No children linked yet.</p>}

      <ul className="flex flex-col gap-4">
        {(children ?? []).map((c: any) => {
          const name = first(c.profiles).full_name ?? "Child";
          const rows = progByLearner.get(c.learner_id) ?? [];
          return (
            <li key={c.learner_id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-slate-900">{name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.consent_granted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {c.consent_granted ? "Consent granted" : "Consent pending"}
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {rows.map((r, i) => {
                    const o = first(r.objectives);
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
    </main>
  );
}
