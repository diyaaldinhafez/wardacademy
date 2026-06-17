import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bloomStage } from "@/lib/progress";
import { logout } from "@/app/studio/actions";
import { addChild, grantConsent } from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";
import { fmtUTC } from "@/lib/datetime";

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
    .select("learner_id, consent_granted, profiles!guardianships_learner_id_fkey(full_name, login_email)");

  const { data: prog } = await supabase
    .from("progress_records")
    .select("learner_id, attempts, correct, completions, objectives(description, level)");

  const progByLearner = new Map<string, any[]>();
  for (const r of (prog ?? []) as any[]) {
    const arr = progByLearner.get(r.learner_id) ?? [];
    arr.push(r);
    progByLearner.set(r.learner_id, arr);
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id")
    .order("scheduled_at");
  const { data: reports } = await supabase.from("session_reports").select("session_id, summary");
  const reportBySession = new Map<string, any>();
  for (const r of (reports ?? []) as any[]) reportBySession.set(r.session_id, r);
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
  for (const pl of (placements ?? []) as any[]) {
    if (!placementByLearner.has(pl.learner_id)) placementByLearner.set(pl.learner_id, pl);
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

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Add a child</h2>
        <form action={addChild} className="flex flex-wrap items-end gap-2">
          <input name="childName" required placeholder="Child's name" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="childPassword" required minLength={6} type="text" placeholder="Set a password" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <SubmitButton pendingText="Adding…" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            Add child
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-slate-400">A simple sign-in is created for your child; their email is shown below.</p>
      </section>

      {(children ?? []).length === 0 && <p className="text-sm text-slate-500">No children linked yet.</p>}

      <ul className="flex flex-col gap-4">
        {(children ?? []).map((c: any) => {
          const name = first(c.profiles).full_name ?? "Child";
          const rows = progByLearner.get(c.learner_id) ?? [];
          const pl = placementByLearner.get(c.learner_id);
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
              <p className="mb-2 text-xs text-slate-500">Sign-in: {first(c.profiles).login_email ?? "—"}</p>
              {pl?.status === "completed" && (
                <p className="mb-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                    Level: {pl.suggested_level}
                  </span>
                </p>
              )}
              {!c.consent_granted && (
                <form action={grantConsent} className="mb-3">
                  <input type="hidden" name="learnerId" value={c.learner_id} />
                  <SubmitButton
                    pendingText="Saving…"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Grant consent
                  </SubmitButton>
                </form>
              )}
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
              {(sessionsByLearner.get(c.learner_id) ?? []).length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="mb-1 text-xs font-medium text-slate-500">Sessions</p>
                  <ul className="flex flex-col gap-1">
                    {(sessionsByLearner.get(c.learner_id) ?? []).map((s: any) => {
                      const r = reportBySession.get(s.id);
                      return (
                        <li key={s.id} className="text-sm text-slate-700">
                          {fmtUTC(s.scheduled_at)}
                          {r ? ` — ${r.summary}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
