import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ITEM_FORMATS, DIFFICULTIES, FORMAT_LABELS } from "@/lib/items";
import { generateDraft, approveItem, rejectItem, logout } from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";

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
          {approved.map((it) => (
            <li key={it.id} className="rounded-xl border border-emerald-200 bg-white p-4">
              <ItemBody it={it} />
            </li>
          ))}
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
