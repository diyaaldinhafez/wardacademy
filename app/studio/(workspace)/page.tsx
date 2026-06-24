import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar, Spark } from "@/components/ward/ui";
import VideoCall from "@/components/VideoCall";

/* eslint-disable @typescript-eslint/no-explicit-any */
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 12 } as const;
const row = { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--ink-100)" } as const;
const btnSm = "ward-btn ward-btn--ghost ward-btn--sm";

function timeOf(iso: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function TodayPage() {
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "studio.today" });
  const now = new Date();
  const nowMs = now.getTime();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const relLabel = (iso: string) => {
    const d = new Date(iso).getTime() - nowMs;
    if (d <= 0) return t("rel.now");
    const mins = Math.round(d / 60000);
    if (mins < 60) return t("rel.inMinutes", { n: mins });
    return t("rel.inHours", { n: Math.round(mins / 60) });
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const learners = (people ?? []).filter(
    (p: any) => ((p.roles as string[]) ?? []).includes("learner") && (!p.assigned_instructor_id || p.assigned_instructor_id === user?.id),
  );
  const nameOf = new Map<string, string>();
  for (const l of learners) nameOf.set(l.id, (l.full_name as string) ?? l.id);
  const nm = (id: string | null) => (id ? nameOf.get(id) ?? t("task.studentFallback") : t("task.studentFallback"));

  // Today's sessions (for the timeline) + the next/ongoing one (for the hero).
  const { data: todaySessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id, lesson_title")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString())
    .order("scheduled_at");
  const { data: nextSessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id, lesson_title")
    .gte("scheduled_at", new Date(nowMs - 2 * 3600 * 1000).toISOString())
    .order("scheduled_at")
    .limit(8);

  const sEnd = (s: any) => new Date(s.scheduled_at).getTime() + (s.duration_minutes ?? 30) * 60000;
  const ongoing = (nextSessions ?? []).find((s: any) => new Date(s.scheduled_at).getTime() <= nowMs && nowMs <= sEnd(s));
  const future = (nextSessions ?? []).find((s: any) => new Date(s.scheduled_at).getTime() > nowMs);
  const hero: any = ongoing ?? future;
  const heroJoinable = hero ? nowMs >= new Date(hero.scheduled_at).getTime() - 10 * 60000 && nowMs <= sEnd(hero) : false;

  const { data: placements } = await supabase.from("placement_tests").select("learner_id, status, suggested_level, created_at").order("created_at", { ascending: false });
  const levelOf = new Map<string, string>();
  for (const pl of (placements ?? []) as any[]) if (pl.status === "completed" && !levelOf.has(pl.learner_id)) levelOf.set(pl.learner_id, pl.suggested_level);

  // ——— Today's tasks (consolidated, deep-linked) ———
  type Task = { key: string; label: string; learnerId: string | null; tone: "warning" | "brand" | "neutral"; href: string };
  const tasks: Task[] = [];

  const since = new Date(nowMs - 14 * 24 * 3600 * 1000).toISOString();
  const { data: pastSessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, learner_id, session_reports(status)")
    .lt("scheduled_at", now.toISOString())
    .gte("scheduled_at", since)
    .order("scheduled_at", { ascending: false });
  for (const s of (pastSessions ?? []) as any[]) {
    const rep = Array.isArray(s.session_reports) ? s.session_reports[0] : s.session_reports;
    const to = `/studio/students/${s.learner_id}?tab=sessions`;
    if (!rep) tasks.push({ key: `rep-${s.id}`, label: t("task.writeReport", { name: nm(s.learner_id) }), learnerId: s.learner_id, tone: "warning", href: to });
    else if (rep.status === "draft") tasks.push({ key: `repd-${s.id}`, label: t("task.approveReport", { name: nm(s.learner_id) }), learnerId: s.learner_id, tone: "warning", href: to });
  }

  const { data: toGrade } = await supabase.from("manual_homework").select("id, learner_id, title").eq("status", "submitted").order("submitted_at", { ascending: false });
  for (const h of (toGrade ?? []) as any[]) tasks.push({ key: `hw-${h.id}`, label: t("task.gradeHomework", { title: h.title, name: nm(h.learner_id) }), learnerId: h.learner_id, tone: "brand", href: `/studio/students/${h.learner_id}?tab=homework` });

  const { data: assessmentDrafts } = await supabase.from("assessments").select("id, learner_id, title").eq("status", "draft");
  for (const a of (assessmentDrafts ?? []) as any[]) tasks.push({ key: `as-${a.id}`, label: t("task.approveAssessment", { title: a.title, name: nm(a.learner_id) }), learnerId: a.learner_id, tone: "neutral", href: `/studio/students/${a.learner_id}?tab=assessments` });

  const { data: itemDrafts } = await supabase.from("items").select("id, target_learner_id").eq("status", "draft").order("created_at", { ascending: false }).limit(30);
  for (const it of (itemDrafts ?? []) as any[]) tasks.push({ key: `it-${it.id}`, label: t("task.reviewItem", { name: nm(it.target_learner_id) }), learnerId: it.target_learner_id, tone: "neutral", href: it.target_learner_id ? `/studio/students/${it.target_learner_id}?tab=homework` : "/studio/students" });

  const attention = new Set(tasks.map((task) => task.learnerId).filter(Boolean) as string[]);
  const remainingToday = (todaySessions ?? []).filter((s: any) => sEnd(s) > nowMs).length;

  const stats = [
    { label: t("stats.todaySessions"), value: (todaySessions ?? []).length, tone: "var(--brand)" },
    { label: t("stats.remainingToday"), value: remainingToday, tone: "var(--leaf-700)" },
    { label: t("stats.pendingTasks"), value: tasks.length, tone: tasks.length ? "var(--apricot-600, #c97a2b)" : "var(--text-muted)" },
    { label: t("stats.students"), value: learners.length, tone: "var(--text-strong)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: s.tone, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, alignItems: "start" }}>
        {/* Left: now/next + today timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Now / next session hero */}
          {hero ? (
            <Card style={{ display: "flex", flexDirection: "column", gap: 12, background: "linear-gradient(135deg, var(--brand-50, #f1ecff), var(--surface-card))", border: "1.5px solid var(--brand-200, #d8ccff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: ongoing ? "var(--rose-600, #c0392b)" : "var(--brand)" }}>{ongoing ? t("heroOngoing") : t("heroNext")}</span>
                <Badge tone="neutral">{relLabel(hero.scheduled_at)}</Badge>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={nm(hero.learner_id)} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-strong)" }}>{nm(hero.learner_id)}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {timeOf(hero.scheduled_at)} · {t("minutes", { n: hero.duration_minutes })}{hero.lesson_title ? ` ${t("lessonPrefix", { title: hero.lesson_title })}` : ""}
                  </div>
                </div>
              </div>
              {heroJoinable ? (
                <VideoCall sessionId={hero.id} />
              ) : (
                <Link href={`/studio/students/${hero.learner_id}?tab=sessions`} className="ward-btn ward-btn--secondary ward-btn--md" style={{ alignSelf: "flex-start" }}>{t("prepareLesson")}</Link>
              )}
            </Card>
          ) : (
            <Card><p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("heroNone")}</p></Card>
          )}

          {/* Roster */}
          <Card>
            <div style={secTitle}>{t("rosterTitle")} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({learners.length})</span></div>
            {learners.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("rosterEmpty")}</p>}
            {learners
              .slice()
              .sort((a: any, b: any) => Number(attention.has(b.id)) - Number(attention.has(a.id)))
              .map((l: any, i: number) => (
                <div key={l.id} style={{ ...row, ...(i === learners.length - 1 ? { borderBottom: "none" } : {}) }}>
                  <Avatar name={l.full_name ?? l.id} size={32} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{l.full_name ?? l.id}</span>
                  {attention.has(l.id) && <Badge tone="warning">{t("needsAttention")}</Badge>}
                  {levelOf.get(l.id) ? <Badge tone="neutral">{levelOf.get(l.id)}</Badge> : <Badge tone="neutral">{t("noLevel")}</Badge>}
                  <Link href={`/studio/students/${l.id}`} className={btnSm}>{t("details")}</Link>
                </div>
              ))}
          </Card>

          {/* Today timeline */}
          <Card>
            <div style={secTitle}>{t("timelineTitle")}</div>
            {(todaySessions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("timelineEmpty")}</p>}
            {(todaySessions ?? []).map((s: any, i: number) => {
              const st = new Date(s.scheduled_at).getTime();
              const state = nowMs > sEnd(s) ? "ended" : st <= nowMs ? "ongoing" : "upcoming";
              return (
                <div key={s.id} style={{ ...row, ...(i === (todaySessions ?? []).length - 1 ? { borderBottom: "none" } : {}), opacity: state === "ended" ? 0.6 : 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: state === "ongoing" ? "var(--rose-600, #c0392b)" : "var(--text-brand)", width: 52, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{timeOf(s.scheduled_at)}</span>
                  <Avatar name={nm(s.learner_id)} size={32} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{nm(s.learner_id)}</span>
                    {s.lesson_title && <span style={{ fontSize: 12, color: "var(--text-muted)" }}> · {s.lesson_title}</span>}
                  </span>
                  {state === "ended" ? <Badge tone="neutral">{t("ended")}</Badge> : state === "ongoing" ? <Badge tone="success">{t("live")}</Badge> : null}
                  <Link href={`/studio/students/${s.learner_id}?tab=sessions`} className={btnSm}>{t("details")}</Link>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Right: tasks inbox */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card variant="soft" style={{ borderColor: "var(--ward-purple-200)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Spark size={18} state="idle" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ward-purple-800)" }}>{t("tasksTitle")}</span>
              {tasks.length > 0 && <Badge tone="brand">{tasks.length}</Badge>}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{t("tasksBlurb")}</p>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--leaf-700)" }}>{t("tasksEmpty")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.slice(0, 12).map((task) => (
                  <Link key={task.key} href={task.href} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-card)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--ward-purple-100)", textDecoration: "none" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: task.tone === "warning" ? "var(--apricot-400)" : task.tone === "brand" ? "var(--brand)" : "var(--ink-300, #c9c4d6)" }} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-body)" }}>{task.label}</span>
                    <span style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, flexShrink: 0 }}>→</span>
                  </Link>
                ))}
                {tasks.length > 12 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("tasksMore", { n: tasks.length - 12 })}</span>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
