import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import WorkspaceHeader from "@/components/studio/WorkspaceHeader";
import { FlowerProgress } from "@/components/bloom/Bloom";
import { SkillBars } from "@/components/bloom/SkillBars";
import { fetchEvidenceBlooms } from "@/lib/progress/bloom";
import { fmtLocal } from "@/lib/datetime";
import { guardianEffectiveLocale } from "@/lib/parentLocale";

/* eslint-disable @typescript-eslint/no-explicit-any */
const first = (x: any) => (Array.isArray(x) ? x[0] : x) ?? {};
const card = "rounded-2xl border border-brand-100 bg-white p-4 shadow-ward-1";
const SKILL_KEYS = ["listening", "speaking", "reading", "writing"];
const short = (t?: string | null) => (t && t.length > 48 ? t.slice(0, 48).trim() + "…" : t || "");

export default async function GuardianPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  // Effective locale: switcher cookie → guardian's saved comms_locale → 'ar'.
  const locale = await guardianEffectiveLocale();
  const tg = await getTranslations({ locale, namespace: "guardian" });
  const tSkill = await getTranslations({ locale, namespace: "common.skills" });
  const skillLabel = (sk: string) => (SKILL_KEYS.includes(sk) ? tSkill(sk) : sk);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: tenant } = await supabase.from("tenants").select("timezone").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const at = (iso: string | null | undefined) => fmtLocal(iso, tz, locale);

  const { data: children } = await supabase
    .from("guardianships")
    .select("learner_id, profiles!guardianships_learner_id_fkey(full_name, login_email)");
  const kids = (children ?? []) as any[];
  const learnerIds = kids.map((c) => c.learner_id);
  const bloomByLearner = await fetchEvidenceBlooms(supabase, learnerIds);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id, lesson_title, instructor_id")
    .order("scheduled_at", { ascending: false });
  const sessionsByLearner = new Map<string, any[]>();
  for (const s of (sessions ?? []) as any[]) {
    const arr = sessionsByLearner.get(s.learner_id) ?? [];
    arr.push(s);
    sessionsByLearner.set(s.learner_id, arr);
  }
  // Instructor display names (for the "next session" line) — one bulk fetch.
  const instructorIds = [...new Set(((sessions ?? []) as any[]).map((s) => s.instructor_id).filter(Boolean))];
  const { data: instructors } = instructorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", instructorIds)
    : { data: [] as any[] };
  const instructorName = new Map<string, string>(((instructors ?? []) as any[]).map((p) => [p.id, p.full_name]));

  const { data: reports } = await supabase.from("session_reports").select("session_id, summary, strengths, improve");
  const reportBySession = new Map<string, any>();
  for (const r of (reports ?? []) as any[]) reportBySession.set(r.session_id, r);

  const { data: doneAssess } = await supabase
    .from("assessments")
    .select("learner_id, title, unit, score, max_score, result, completed_at, curriculum_unit_id")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  const assessByLearner = new Map<string, any[]>();
  for (const a of (doneAssess ?? []) as any[]) {
    const arr = assessByLearner.get(a.learner_id) ?? [];
    arr.push(a);
    assessByLearner.set(a.learner_id, arr);
  }

  // Catalog unit titles for the localized result-card unit (display-time, no mutation).
  // Bilingual surface: pick by the guardian's active locale; stored a.unit/a.title is the
  // fallback for manual/non-catalog assessments (no curriculum_unit_id).
  const assessUnitIds = [...new Set(((doneAssess ?? []) as any[]).map((a) => a.curriculum_unit_id).filter(Boolean))];
  const { data: assessUnitRows } = assessUnitIds.length
    ? await supabase.from("curriculum_units").select("unit_id, title_en, title_ar").in("unit_id", assessUnitIds)
    : { data: [] as any[] };
  const unitTitleById = new Map<string, { en: string | null; ar: string | null }>(
    ((assessUnitRows ?? []) as any[]).map((u) => [u.unit_id, { en: u.title_en, ar: u.title_ar }]),
  );
  const localizedUnit = (a: any) => {
    const cat = a.curriculum_unit_id ? unitTitleById.get(a.curriculum_unit_id) : null;
    const picked = cat ? (locale === "en" ? cat.en ?? cat.ar : cat.ar ?? cat.en) : null;
    return picked ?? a.unit ?? a.title;
  };

  const { data: placements } = await supabase
    .from("placement_tests")
    .select("learner_id, status, suggested_level, created_at")
    .order("created_at", { ascending: false });
  const placementByLearner = new Map<string, any>();
  for (const pl of (placements ?? []) as any[]) if (!placementByLearner.has(pl.learner_id)) placementByLearner.set(pl.learner_id, pl);

  const { data: studyPlans } = await supabase
    .from("study_plans")
    .select("learner_id, items, scope_label, milestone_label")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  const planByLearner = new Map<string, any>();
  for (const sp2 of (studyPlans ?? []) as any[]) if (!planByLearner.has(sp2.learner_id)) planByLearner.set(sp2.learner_id, sp2);

  // ---- Selected child: ?child= (validated) else the first child ----
  const selectedId = sp.child && learnerIds.includes(sp.child) ? sp.child : learnerIds[0];
  const sel = kids.find((c) => c.learner_id === selectedId);
  const name = sel ? first(sel.profiles).full_name ?? tg("childFallback") : "";
  const bloom = bloomByLearner.get(selectedId);
  const pl = placementByLearner.get(selectedId);
  const plan = planByLearner.get(selectedId);

  // One warm, number-free motivational line above the flower's skills key. Derived
  // (display-only, no storage) from the average of the four existing skill blooms.
  // Thresholds mirror the petal bud→bloom logic (0.34 / 0.67): low / mid / high.
  const skillFractions = ((bloom?.skills ?? []) as any[]).map((s) => Math.max(0, Math.min(1, s.fraction ?? 0)));
  const avgBloom = skillFractions.length ? skillFractions.reduce((a, b) => a + b, 0) / skillFractions.length : 0;
  const motivation = skillFractions.length ? tg(`flowerMotivation.${avgBloom < 0.34 ? "low" : avgBloom < 0.67 ? "mid" : "high"}`) : null;

  // Next session (upcoming, soonest first) — informational, no join button.
  const now = Date.now();
  const upcoming = (sessionsByLearner.get(selectedId) ?? [])
    .filter((s: any) => new Date(s.scheduled_at).getTime() >= now)
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const nextSession = upcoming[0] ?? null;

  // Reports (newest first) + completed results (newest first).
  const reportsList = (sessionsByLearner.get(selectedId) ?? [])
    .filter((s: any) => reportBySession.get(s.id))
    .map((s: any) => ({ s, r: reportBySession.get(s.id) }));
  const resultsList = assessByLearner.get(selectedId) ?? [];

  // Plan glimpse: "{level} · Unit x of y" (y = the child's level's unit set).
  let planLine: string | null = null;
  if (plan) {
    const unitNames: string[] = [];
    for (const it of (plan.items as any[]) ?? []) {
      const u = (it.unit as string) || tg("unitFallback");
      if (unitNames[unitNames.length - 1] !== u) unitNames.push(u);
    }
    const total = unitNames.length;
    if (total > 0) {
      const current = Math.min(Math.max(bloom?.startedUnits?.length ?? 0, 1), total);
      const level = pl?.suggested_level ?? (plan.items as any[])?.[0]?.level ?? "—";
      planLine = tg("planGlimpse", { level, current, total });
    }
  }

  const Result = ({ a }: { a: any }) => {
    const result = (a.result ?? {}) as Record<string, { correct: number; total: number }>;
    const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
    return (
      <div className="rounded-xl bg-brand-50/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-ink" dir="auto">{localizedUnit(a)}</span>
          <span className="flex-shrink-0 text-sm font-bold text-leaf">{a.score}/{a.max_score} · {pct}%</span>
        </div>
        {a.completed_at && <p className="text-xs text-ink-soft">{at(a.completed_at)}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.entries(result).filter(([sk]) => SKILL_KEYS.includes(sk)).map(([sk, v]) => (
            <span key={sk} className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-soft">{skillLabel(sk)}: <b className="text-brand-700">{v.correct}/{v.total}</b></span>
          ))}
        </div>
      </div>
    );
  };

  const ReportCard = ({ s, r, soft }: { s: any; r: any; soft?: boolean }) => (
    <div className={`rounded-xl ${soft ? "bg-brand-50/40" : "bg-brand-50/60"} p-2.5 text-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700/70">{at(s.scheduled_at)}{s.lesson_title ? ` · ${short(s.lesson_title)}` : ""}</p>
      <p dir="auto" className="mt-1.5 text-ink">{r.summary}</p>
      {r.strengths && <p className="mt-1 text-ink-soft"><span className="font-medium">{tg("strengths")}</span> <span dir="auto">{r.strengths}</span></p>}
      {r.improve && <p className="text-ink-soft"><span className="font-medium">{tg("nextStep")}</span> <span dir="auto">{r.improve}</span></p>}
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      {/* PA-2: guardian dashboard is Arabic-only — the language switcher is hidden here (the
          LocaleSwitcher component + its landing usage are untouched; removed fully in PA-4). */}
      <WorkspaceHeader title={tg("title")} subtitle={profile?.full_name ?? user.email ?? ""} />

      {kids.length === 0 ? (
        <p className="text-sm text-ink-soft">{tg("noChildren")}</p>
      ) : (
        <>
          {/* Child switcher — a horizontal row of avatars; name shown under the selected one only. */}
          <div className="mb-6 flex items-start gap-4 overflow-x-auto pb-1">
            {kids.map((c) => {
              const nm = first(c.profiles).full_name ?? tg("childFallback");
              const active = c.learner_id === selectedId;
              return (
                <Link key={c.learner_id} href={`/guardian?child=${c.learner_id}`} className="flex w-14 flex-shrink-0 flex-col items-center gap-1.5">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold transition ${active ? "bg-brand text-white shadow-ward-1 ring-2 ring-brand-200" : "bg-brand-50 text-brand-700"}`}>
                    {(nm.trim().charAt(0) || "?").toUpperCase()}
                  </span>
                  {active && <span className="line-clamp-2 w-full text-center text-xs font-bold leading-tight text-ink [overflow-wrap:anywhere]" dir="auto">{nm.trim().split(/\s+/)[0] || nm}</span>}
                </Link>
              );
            })}
          </div>

          {/* Selected child — separate cards, separated by space + shadow. */}
          {sel && (
            <div className="flex flex-col gap-4">
              {/* Flower — the hero of the page */}
              <div className={`${card} flex flex-col items-center gap-2 text-center`}>
                <p className="self-start font-bold text-ink" dir="auto">{name}</p>
                <FlowerProgress size={200} skills={(bloom?.skills ?? []).map((s: any) => ({ label: skillLabel(s.skill), value: s.fraction }))} />
                {motivation && (
                  <p className="rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700" dir="auto">{motivation}</p>
                )}
                {/* Per-skill mastery bars — the SAME component the teacher studio uses,
                    shown to the parent in percent (round(fraction*100)%). Sits below the
                    motivational line, fills the card. Apricot bar = a lagging skill. */}
                {(bloom?.skills?.length ?? 0) > 0 && (
                  <div className="mt-1 flex w-full flex-col gap-1.5">
                    <SkillBars
                      valueFormat="percent"
                      skills={(bloom!.skills as any[]).map((s) => ({ key: s.skill, label: skillLabel(s.skill), fraction: s.fraction, value: s.value, total: s.total }))}
                    />
                  </div>
                )}
                {planLine ? (
                  <p className="text-sm font-medium text-brand-700">{planLine}</p>
                ) : (
                  <p className="text-sm text-ink-soft">{tg("noPlanYet")}</p>
                )}
              </div>

              {/* Next session */}
              <div className={card}>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{tg("nextSession")}</p>
                {nextSession ? (
                  // Parents want when + with whom, not the lesson objective — and the
                  // 48-char truncation chopped titles mid-word. Show date + teacher only.
                  <p className="mt-1 text-sm text-ink">
                    {at(nextSession.scheduled_at)}
                    {nextSession.instructor_id && instructorName.get(nextSession.instructor_id) ? ` · ${instructorName.get(nextSession.instructor_id)}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">{tg("noUpcoming")}</p>
                )}
              </div>

              {/* Latest report */}
              {reportsList.length > 0 && (
                <div className={card}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{tg("latestReport")}</p>
                  <ReportCard s={reportsList[0].s} r={reportsList[0].r} />
                  {reportsList.length > 1 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-brand-700">{tg("viewAllReports")}</summary>
                      <ul className="mt-2 flex flex-col gap-2">
                        {reportsList.slice(1).map(({ s, r }: any) => (
                          <li key={s.id}><ReportCard s={s} r={r} soft /></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              {/* Latest result */}
              {resultsList.length > 0 && (
                <div className={card}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{tg("latestResult")}</p>
                  <Result a={resultsList[0]} />
                  {resultsList.length > 1 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-brand-700">{tg("viewAllResults")}</summary>
                      <ul className="mt-2 flex flex-col gap-2">
                        {resultsList.slice(1).map((a: any, ai: number) => (
                          <li key={ai}><Result a={a} /></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
