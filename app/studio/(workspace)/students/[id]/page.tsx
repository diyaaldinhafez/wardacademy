/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  startPlacement, startPlanFromCatalog, approvePlan, draftReportWithAI, assignItem,
  addResource, removeResource, generateAssessmentTest, approveAssessment, removeAssessment,
  generateDraft, approveItem, rejectItem, updateReport, approveReport,
  addLessonSlot, removeLessonSlot, generateLessonSessions,
  createManualHomework, gradeManualHomework, removeManualHomework,
  generateDiagnosticReport, updateDiagnostic, approveDiagnostic,
} from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SessionScheduleForm from "@/components/studio/SessionScheduleForm";
import StudentTabs, { type StudentTab } from "@/components/studio/StudentTabs";
import PlanView from "@/components/studio/PlanView";
import ItemCard from "@/components/studio/ItemCard";
import VideoCall from "@/components/VideoCall";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { SkillBars } from "@/components/bloom/SkillBars";
import { SKILLS, stageForValue } from "@/lib/skills";
import { getTranslations } from "next-intl/server";
import { UnitBloom, FlowerProgress, ScopeChip } from "@/components/bloom/Bloom";
import { fetchEvidenceBloom } from "@/lib/progress/bloom";
import { aggregatePlanItems } from "@/lib/curriculum/aggregatePlan";
import { FORMAT_LABELS, ITEM_FORMATS, DIFFICULTIES } from "@/lib/items";
import { WEEKDAY_EN } from "@/lib/availability";
import { fmtUTC } from "@/lib/datetime";

const one = (o: any) => (Array.isArray(o) ? o[0] : o);
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const ctl = "ward-field__control";
const sel = "ward-select__control";
const secTitle = { fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" } as const;

const fmtSize = (n?: number | null) => (n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
function fileKind(name?: string | null, mime?: string | null): string {
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mime?.includes("pdf")) return "PDF";
  if (["doc", "docx"].includes(ext) || mime?.includes("word")) return "Word";
  if (["ppt", "pptx"].includes(ext) || mime?.includes("presentation") || mime?.includes("powerpoint")) return "PowerPoint";
  if (["xls", "xlsx"].includes(ext) || mime?.includes("sheet") || mime?.includes("excel")) return "Excel";
  if (ext === "txt") return "Text";
  return "File";
}

function subStatus(sub: any) {
  if (!sub) return { tone: "neutral" as const, key: "notSubmitted" };
  if (!sub.graded) return { tone: "warning" as const, key: "awaitingGrading" };
  if (!sub.counts_toward_mastery) return { tone: "brand" as const, key: "done" };
  return sub.is_correct ? { tone: "success" as const, key: "correct" } : { tone: "danger" as const, key: "needsReview" };
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: learner } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id").eq("id", id).maybeSingle();
  if (!learner || !((learner.roles as string[]) ?? []).includes("learner")) notFound();
  if (learner.assigned_instructor_id && learner.assigned_instructor_id !== user?.id) notFound();
  const name = (learner.full_name as string) ?? id;
  // The teacher studio is English by internal decision — force `en` for UI text.
  const t = await getTranslations({ locale: "en", namespace: "studio.student" });
  const tc = await getTranslations({ locale: "en", namespace: "common" });
  const skillLabel = (sk: string) => (["listening", "speaking", "reading", "writing"].includes(sk) ? tc(`skills.${sk}`) : sk);

  const { data: pl } = await supabase.from("placement_tests").select("status, suggested_level, created_at").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: plan } = await supabase.from("study_plans").select("id, title, level, items, status, track, scope_label, milestone_label").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const planItems: any[] = (plan?.items as any[]) ?? [];

  // Evidence model: unit/skill blooms rolled up from objective_evidence (§5/§6.2).
  const bloom = await fetchEvidenceBloom(supabase, id);
  // Per-objective evidence log (teacher diagnostic · read-only · RLS-scoped). Grouped by objective.
  const { data: evidenceRows } = await supabase
    .from("objective_evidence")
    .select("objective_id, value, source, created_at")
    .eq("learner_id", id)
    .order("created_at", { ascending: false });
  const evidenceByObjective = new Map<string, { value: number; source: string; created_at: string }[]>();
  for (const e of (evidenceRows ?? []) as any[]) {
    const arr = evidenceByObjective.get(e.objective_id) ?? [];
    arr.push(e);
    evidenceByObjective.set(e.objective_id, arr);
  }
  const meanOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const evDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const petals = bloom.skills.map((s) => ({ name: s.skill, label: tc(`skills.${s.skill}`), value: s.fraction }));
  const overall = bloom.skills.length ? Math.round((bloom.skills.reduce((a, s) => a + s.fraction, 0) / bloom.skills.length) * 100) : 0;
  const skillStats = bloom.skills;
  const lagging = bloom.skills.filter((s) => s.total > 0 && s.fraction < 0.5).map((s) => skillLabel(s.skill));
  const startedUnits = bloom.startedUnits;
  // Catalog units drive AI unit-test generation (auto evidence feeds the new model).
  const { data: curriculumUnits } = await supabase
    .from("curriculum_units").select("unit_id, level, unit_number, title_ar, title_en").order("level").order("unit_number");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, lesson_title, plan_item_index, session_reports(id, status, summary, strengths, improve)")
    .eq("learner_id", id)
    .order("scheduled_at", { ascending: true });
  const nowIso = new Date().toISOString();
  const upcoming = (sessions ?? []).filter((s: any) => s.status === "scheduled" && s.scheduled_at >= nowIso);
  const past = (sessions ?? []).filter((s: any) => !(s.status === "scheduled" && s.scheduled_at >= nowIso));
  const nextSession = upcoming[0];

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, session_id, created_at, items(id, prompt, format, difficulty)")
    .eq("learner_id", id)
    .order("created_at", { ascending: false });
  const { data: subs } = await supabase.from("submissions").select("item_id, is_correct, graded, counts_toward_mastery").eq("learner_id", id);
  const subByItem = new Map<string, any>();
  for (const s of (subs ?? []) as any[]) subByItem.set(s.item_id, s);
  const assignsBySession = new Map<string, any[]>();
  const looseAssigns: any[] = [];
  for (const a of (assignments ?? []) as any[]) {
    if (a.session_id) {
      const arr = assignsBySession.get(a.session_id) ?? [];
      arr.push(a);
      assignsBySession.set(a.session_id, arr);
    } else looseAssigns.push(a);
  }

  // Approved items relevant to this learner (targeted to them, or untargeted/shared).
  const { data: approvedItems } = await supabase.from("items").select("id, prompt, format").eq("status", "approved").or(`target_learner_id.eq.${id},target_learner_id.is.null`).order("created_at", { ascending: false });
  // This learner's own AI homework drafts (await teacher approval).
  const { data: draftItems } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, status, item_keys(answer, explanation, rubric), curriculum_objectives(descriptor_ar, level)")
    .eq("status", "draft").eq("target_learner_id", id)
    .order("created_at", { ascending: false });
  // The Ward Curriculum objectives for the plan's level — the bank the teacher
  // generates homework from (catalog only; works for any approved plan).
  const objectives = plan?.level ? await aggregatePlanItems(supabase, plan.level) : [];

  // Forced-English DISPLAY fallback for catalog text. study_plans.items + aggregatePlan
  // hold the Arabic snapshot (keyed by objective_id); rather than mutate stored plans we
  // prefer descriptor_en/title_en from the catalog at render time, keyed by objective_id
  // (and unit_id derived from it). All filled today; the ?? is a safety net for any future
  // objective lacking _en. Parent surfaces are untouched.
  const unitIdOf = (id: string) => id.replace(/-[LRSW]\d+$/, "");
  let descEn = new Map<string, string | null>();
  let titleEn = new Map<string, string | null>();
  if (planItems.length || objectives.length) {
    const [{ data: oEn }, { data: uEn }] = await Promise.all([
      supabase.from("curriculum_objectives").select("objective_id, descriptor_en"),
      supabase.from("curriculum_units").select("unit_id, title_en"),
    ]);
    descEn = new Map(((oEn ?? []) as any[]).map((o) => [o.objective_id, o.descriptor_en]));
    titleEn = new Map(((uEn ?? []) as any[]).map((u) => [u.unit_id, u.title_en]));
  }
  const enText = (it: any) => ({ ...it, description: descEn.get(it.id) ?? it.description, unit: titleEn.get(unitIdOf(it.id)) ?? it.unit });
  const planItemsEn = planItems.map(enText);
  const objectivesEn = (objectives as any[]).map(enText);

  const { data: resources } = await supabase.from("learning_resources").select("id, title, note, file_path, file_name, mime_type, size_bytes, created_at").eq("learner_id", id).order("created_at", { ascending: false });
  // Short-lived signed download URLs for the private resource files.
  const resourceUrls = new Map<string, string>();
  const withFiles = (resources ?? []).filter((r: any) => r.file_path);
  if (withFiles.length) {
    const admin = createAdminClient();
    await Promise.all(withFiles.map(async (r: any) => {
      const { data } = await admin.storage.from("learning-resources").createSignedUrl(r.file_path, 3600);
      if (data?.signedUrl) resourceUrls.set(r.id, data.signedUrl);
    }));
  }
  // Guardian WhatsApp (leads is admin-gated by RLS; this learner is already authorised, so read the phone via service-role).
  let guardianPhone: string | null = null;
  let guardianLocale = "ar"; // parent-facing WhatsApp goes out in the guardian's language (fallback Arabic).
  {
    const admin = createAdminClient();
    const { data: leadRow } = await admin.from("leads").select("guardian_phone, guardian_locale").eq("converted_learner_id", id).maybeSingle();
    guardianPhone = (leadRow?.guardian_phone ?? "").replace(/\D/g, "") || null;
    if (leadRow?.guardian_locale === "en") guardianLocale = "en";
  }
  // Parent-locale translators for the WhatsApp messages (NOT the teacher's forced-en UI).
  const twa = await getTranslations({ locale: guardianLocale, namespace: "comms.whatsapp" });
  const tcwa = await getTranslations({ locale: guardianLocale, namespace: "common" });
  const waSkillLabel = (sk: string) => (["listening", "speaking", "reading", "writing"].includes(sk) ? tcwa(`skills.${sk}`) : sk);

  const { data: assessments } = await supabase.from("assessments").select("id, title, scope, status, score, max_score, notes, scheduled_for, completed_at, unit, result").eq("learner_id", id).order("created_at", { ascending: false });
  // Questions for DRAFT assessments, so the teacher can review before approving.
  const aqByAssessment = new Map<string, any[]>();
  const draftAssessmentIds = (assessments ?? []).filter((a: any) => a.status === "draft").map((a: any) => a.id);
  if (draftAssessmentIds.length) {
    const { data: aq } = await supabase.from("assessment_questions").select("id, assessment_id, position, skill, prompt, content, answer").in("assessment_id", draftAssessmentIds).order("position");
    for (const q of (aq ?? []) as any[]) {
      const arr = aqByAssessment.get(q.assessment_id) ?? [];
      arr.push(q);
      aqByAssessment.set(q.assessment_id, arr);
    }
  }
  const { data: lessonSlots } = await supabase.from("lesson_schedules").select("id, weekday, time_of_day, duration_minutes").eq("learner_id", id).order("weekday");
  const { data: availRules } = await supabase.from("availability_rules").select("weekday, start_time, end_time, slot_minutes").eq("active", true);
  const { data: tenantRow } = await supabase.from("tenants").select("slot_break_minutes").maybeSingle();
  const lessonBreak = tenantRow?.slot_break_minutes ?? 15;
  // Discrete bookable times per weekday, inside the teacher's availability windows.
  const toMinT = (t: string) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
  const fmtT = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const availByWeekday = new Map<number, { time: string; duration: number }[]>();
  for (const r of (availRules ?? []) as any[]) {
    const s = toMinT(r.start_time), e = toMinT(r.end_time), step = r.slot_minutes + lessonBreak;
    const arr = availByWeekday.get(r.weekday) ?? [];
    for (let t = s; t + r.slot_minutes <= e; t += step) arr.push({ time: fmtT(t), duration: r.slot_minutes });
    availByWeekday.set(r.weekday, arr);
  }
  const slotByKey = new Map<string, any>((lessonSlots ?? []).map((s: any) => [`${s.weekday}|${String(s.time_of_day).slice(0, 5)}`, s]));
  const { data: diagnostic } = await supabase.from("diagnostics").select("report, status").eq("learner_id", id).maybeSingle();

  // Manual homework (image-based) + signed URLs for its files, grouped by session.
  const { data: manualHw } = await supabase
    .from("manual_homework")
    .select("id, session_id, title, instructions, status, score, max_score, feedback, homework_files(id, kind, file_name, file_path)")
    .eq("learner_id", id)
    .order("created_at", { ascending: false });
  const hwFileUrls = new Map<string, string>();
  {
    const allFiles = (manualHw ?? []).flatMap((h: any) => h.homework_files ?? []);
    if (allFiles.length) {
      const admin = createAdminClient();
      await Promise.all(allFiles.map(async (f: any) => {
        const { data } = await admin.storage.from("homework-files").createSignedUrl(f.file_path, 3600);
        if (data?.signedUrl) hwFileUrls.set(f.id, data.signedUrl);
      }));
    }
  }
  const manualBySession = new Map<string, any[]>();
  const looseManual: any[] = [];
  for (const h of (manualHw ?? []) as any[]) {
    if (h.session_id) { const arr = manualBySession.get(h.session_id) ?? []; arr.push(h); manualBySession.set(h.session_id, arr); }
    else looseManual.push(h);
  }

  // Alerts
  const pastNoReport = past.filter((s: any) => !one(s.session_reports)).length;
  const ungraded = (subs ?? []).filter((s: any) => !s.graded).length;
  const noApprovedPlan = !plan || plan.status !== "approved";
  const alerts: { tone: "danger" | "warning" | "neutral"; label: string }[] = [];
  if (noApprovedPlan) alerts.push({ tone: "warning", label: t("alerts.noApprovedPlan") });
  if (pastNoReport) alerts.push({ tone: "danger", label: t("alerts.sessionsNoReport", { n: pastNoReport }) });
  if (ungraded) alerts.push({ tone: "warning", label: t("alerts.ungradedHomework", { n: ungraded }) });

  // ————— Reusable bits —————
  const HomeworkRow = ({ a }: { a: any }) => {
    const it = one(a.items);
    if (!it) return null;
    const st = subStatus(subByItem.get(it.id));
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
        <span style={{ color: "var(--text-body)", flex: 1 }}>{it.prompt}</span>
        <Badge tone="neutral">{FORMAT_LABELS[it.format as keyof typeof FORMAT_LABELS] ?? it.format}</Badge>
        <Badge tone={st.tone}>{t(`status.${st.key}`)}</Badge>
      </div>
    );
  };

  const AssignToSession = ({ sessionId }: { sessionId: string }) =>
    (approvedItems ?? []).length === 0 ? null : (
      <form action={assignItem} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="learnerId" value={id} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <select name="itemId" required defaultValue="" className={sel} style={{ width: "auto", minHeight: 34, maxWidth: 220, fontSize: 12.5 }}>
          <option value="" disabled>{t("homework.assignPlaceholder")}</option>
          {(approvedItems ?? []).map((it: any) => <option key={it.id} value={it.id}>{it.prompt.slice(0, 40)}</option>)}
        </select>
        <SubmitButton pendingText="…" className={btn("ghost")}>{t("homework.add")}</SubmitButton>
      </form>
    );

  // A manual homework: teacher files, the student's uploaded solution, grading.
  const ManualHwItem = ({ h }: { h: any }) => {
    const tFiles = (h.homework_files ?? []).filter((f: any) => f.kind !== "submission");
    const subFiles = (h.homework_files ?? []).filter((f: any) => f.kind === "submission");
    const tone = h.status === "graded" ? "success" : h.status === "submitted" ? "warning" : "neutral";
    const label = h.status === "graded" ? `${t("manualHw.graded")}${h.score != null ? `: ${h.score}${h.max_score != null ? `/${h.max_score}` : ""}` : ""}` : h.status === "submitted" ? t("manualHw.awaitingGrading") : t("manualHw.awaitingStudent");
    return (
      <div style={{ borderRadius: 10, background: "var(--surface-soft)", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="brand">{t("manualHw.tag")}</Badge>
          <span dir="auto" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", flex: 1 }}>{h.title}</span>
          <Badge tone={tone}>{label}</Badge>
          <form action={removeManualHomework}><input type="hidden" name="manualHomeworkId" value={h.id} /><input type="hidden" name="learnerId" value={id} /><SubmitButton className={btn("ghost")}>✕</SubmitButton></form>
        </div>
        {h.instructions && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{h.instructions}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[...tFiles, ...subFiles].map((f: any) => {
            const href = hwFileUrls.get(f.id);
            return href ? (
              <a key={f.id} href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: f.kind === "submission" ? "var(--leaf-700)" : "var(--brand)", textDecoration: "none", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "3px 8px" }}>
                {t(`hwKind.${f.kind}`)} ↓
              </a>
            ) : null;
          })}
        </div>
        {h.status === "submitted" && (
          <form action={gradeManualHomework} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
            <input type="hidden" name="manualHomeworkId" value={h.id} />
            <input type="hidden" name="learnerId" value={id} />
            <input name="score" type="number" placeholder={t("manualHw.scorePlaceholder")} className={ctl} style={{ width: 90 }} />
            <input name="maxScore" type="number" placeholder={t("manualHw.outOfPlaceholder")} className={ctl} style={{ width: 80 }} />
            <input name="feedback" placeholder={t("manualHw.feedbackPlaceholder")} className={ctl} style={{ width: "auto", flex: 1, minWidth: 120 }} />
            <SubmitButton pendingText="…" className={btn("success")}>{t("manualHw.grade")}</SubmitButton>
          </form>
        )}
        {h.status === "graded" && h.feedback && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{t("manualHw.notePrefix")} {h.feedback}</p>}
      </div>
    );
  };

  const ManualHwCreate = ({ sessionId }: { sessionId: string | null }) => (
    <details>
      <summary style={{ fontSize: 12.5, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>{t("homework.manualSummary")}</summary>
      <form action={createManualHomework} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        <input type="hidden" name="learnerId" value={id} />
        {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
        <input name="title" required placeholder={t("homework.manualTitlePlaceholder")} className={ctl} />
        <input name="instructions" placeholder={t("homework.manualInstructionsPlaceholder")} className={ctl} />
        <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("homework.manualPromptLabel")}</label>
        <input name="prompt" type="file" required accept="image/*,.pdf" className={ctl} />
        <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("homework.manualWorksheetsLabel")}</label>
        <input name="worksheets" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" className={ctl} />
        <SubmitButton pendingText={t("homework.manualUploading")} className={btn("secondary")}>{t("homework.manualCreate")}</SubmitButton>
      </form>
    </details>
  );

  // Post-session report: teacher fills ready choices + an open note → AI writes it.
  const REPORT_FIELDS = (["engagement", "comprehension", "behavior", "focusNext"] as const).map((nameKey) => ({
    name: nameKey,
    required: nameKey === "engagement" || nameKey === "comprehension",
    label: t(`reportFields.${nameKey}.label`),
    opts: t.raw(`reportFields.${nameKey}.opts`) as string[],
  }));
  // Parent-facing WhatsApp template — rendered in the guardian's language (twa),
  // not the teacher's forced-en UI. Interpolated values (report.summary/strengths/
  // improve) are the AI-authored content, left as-is.
  const reportWaLink = (s: any, report: any) => {
    if (!guardianPhone) return null;
    const text =
      `*${name} — ${twa("report.title")}*\n${fmtUTC(s.scheduled_at)}${s.lesson_title ? ` — ${s.lesson_title}` : ""}\n\n${report.summary}` +
      (report.strengths ? `\n\n${twa("report.strengths")}: ${report.strengths}` : "") +
      (report.improve ? `\n${twa("report.nextStep")}: ${report.improve}` : "") +
      `\n\n${tcwa("appName")}`;
    return `https://wa.me/${guardianPhone}?text=${encodeURIComponent(text)}`;
  };

  const SessionCard = ({ s, showJoin = false, showReport = false }: { s: any; showJoin?: boolean; showReport?: boolean }) => {
    const report = one(s.session_reports);
    const waLink = report?.status === "approved" ? reportWaLink(s, report) : null;
    return (
      <div style={{ borderRadius: 12, border: "1px solid var(--border-soft)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(s.scheduled_at)}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {t("sched.minutes", { n: s.duration_minutes })}</span>
          {showReport && report?.status === "approved" && <Badge tone="success">{t("report.sent")}</Badge>}
        </div>
        {s.lesson_title && <div style={{ fontSize: 13, color: "var(--text-body)" }}>{t("report.lessonLabel")} <strong dir="auto">{s.lesson_title}</strong></div>}
        {showJoin && s.status === "scheduled" && <VideoCall sessionId={s.id} />}

        {showReport && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--ink-100)", paddingTop: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" }}>{t("report.title")}</span>

            {!report && (
              <form action={draftReportWithAI} style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
                <input type="hidden" name="sessionId" value={s.id} />
                <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("report.draftHint")}</p>
                {REPORT_FIELDS.map((f) => (
                  <label key={f.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 130, flexShrink: 0, color: "var(--text-body)" }}>{f.label}</span>
                    <select name={f.name} required={f.required} defaultValue="" className={sel} style={{ flex: 1, minHeight: 36, fontSize: 12.5 }}>
                      <option value="" disabled>{t("report.select")}</option>
                      {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                ))}
                <textarea name="teacherNote" rows={2} className={ctl} placeholder={t("report.notePlaceholder")} />
                <SubmitButton pendingText={t("report.generating")} className={btn("soft")}><Spark size={13} /> {t("report.generate")}</SubmitButton>
              </form>
            )}

            {report?.status === "draft" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
                <AITrustBadge status="draft" />
                <form action={updateReport} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <textarea name="summary" required rows={3} defaultValue={report.summary ?? ""} className={ctl} placeholder={t("report.summaryPlaceholder")} />
                  <input name="strengths" defaultValue={report.strengths ?? ""} className={ctl} placeholder={t("report.strengthsPlaceholder")} />
                  <input name="improve" defaultValue={report.improve ?? ""} className={ctl} placeholder={t("report.nextStepPlaceholder")} />
                  <SubmitButton pendingText="…" className={btn("secondary")}>{t("report.saveEdits")}</SubmitButton>
                </form>
                <form action={approveReport}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <SubmitButton pendingText="…" className={btn("success")}>{t("report.approve")}</SubmitButton>
                </form>
              </div>
            )}

            {report?.status === "approved" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <AITrustBadge status="approved" compact />
                  <span style={{ fontSize: 12, color: "var(--leaf-700)" }}>{t("report.approvedVisible")}</span>
                  {waLink ? (
                    <a href={waLink} target="_blank" rel="noreferrer" className={btn("success")} style={{ marginInlineStart: "auto", textDecoration: "none" }}>{t("report.shareWhatsapp")}</a>
                  ) : (
                    <span style={{ marginInlineStart: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>{t("report.noWhatsapp")}</span>
                  )}
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-body)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{report.summary}</p>
                {report.strengths && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("report.strengthsPlaceholder")}: {report.strengths}</p>}
                {report.improve && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("report.nextStepPlaceholder")}: {report.improve}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // A session's homework block (lives in the Homework tab, not the Sessions tab).
  const HwSessionCard = ({ s }: { s: any }) => {
    const hw = assignsBySession.get(s.id) ?? [];
    const mhw = manualBySession.get(s.id) ?? [];
    return (
      <div style={{ borderRadius: 12, border: "1px solid var(--border-soft)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(s.scheduled_at)}</span>
          {s.lesson_title && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{s.lesson_title}</span>}
          <Badge tone={s.status === "completed" ? "success" : s.status === "scheduled" ? "brand" : "neutral"}>{s.status}</Badge>
        </div>
        {hw.length === 0 && mhw.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{t("homework.noHwForSession")}</span>}
        {hw.map((a: any) => <HomeworkRow key={a.id} a={a} />)}
        {mhw.map((h: any) => <ManualHwItem key={h.id} h={h} />)}
        <AssignToSession sessionId={s.id} />
        <ManualHwCreate sessionId={s.id} />
      </div>
    );
  };

  // ————— Tab contents —————
  const Overview = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Diagnostic (baseline) — generated from all the student's inputs */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secTitle}>{t("overview.diagnosisTitle")}</span>
          {diagnostic?.status === "approved" && <AITrustBadge status="approved" compact />}
          {diagnostic?.status === "draft" && <AITrustBadge status="draft" compact />}
          <form action={generateDiagnosticReport} style={{ marginInlineStart: "auto" }}>
            <input type="hidden" name="learnerId" value={id} />
            <SubmitButton pendingText={t("overview.generating")} className={btn("soft")}><Spark size={13} /> {diagnostic ? t("overview.regenerate") : t("overview.generateDiagnostic")}</SubmitButton>
          </form>
        </div>
        {!diagnostic && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("overview.diagnosticHint")}</p>}
        {diagnostic?.status === "draft" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
            <form action={updateDiagnostic} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input type="hidden" name="learnerId" value={id} />
              <textarea name="report" rows={8} defaultValue={diagnostic.report ?? ""} className={ctl} style={{ lineHeight: 1.7 }} />
              <SubmitButton pendingText="…" className={btn("secondary")}>{t("overview.saveEdits")}</SubmitButton>
            </form>
            <form action={approveDiagnostic}>
              <input type="hidden" name="learnerId" value={id} />
              <SubmitButton pendingText="…" className={btn("success")}>{t("overview.approveDiagnostic")}</SubmitButton>
            </form>
          </div>
        )}
        {diagnostic?.status === "approved" && (
          <p style={{ fontSize: 13.5, color: "var(--text-body)", whiteSpace: "pre-line", lineHeight: 1.8 }}>{diagnostic.report}</p>
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>{t("overview.nextSessionTitle")}</div>
        {nextSession ? (
          <div style={{ fontSize: 13.5, color: "var(--text-body)" }}>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmtUTC(nextSession.scheduled_at)}</strong>
            {nextSession.lesson_title ? <> · {nextSession.lesson_title}</> : null}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("overview.noUpcoming")}</p>
        )}
      </Card>
      {alerts.length > 0 && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={secTitle}>{t("overview.alertsTitle")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {alerts.map((a, i) => <Badge key={i} tone={a.tone}>{a.label}</Badge>)}
          </div>
        </Card>
      )}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>{t("overview.skillsTitle")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {petals.map((p) => (
            <span key={p.name} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "3px 10px" }}>{p.label} {Math.round(p.value * 100)}%</span>
          ))}
        </div>
      </Card>
    </div>
  );

  const Plan = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secTitle}>{t("plan.title")}</span>
          {pl?.status !== "in_progress" && (
            <form action={startPlacement} style={{ marginInlineStart: "auto" }}>
              <input type="hidden" name="learnerId" value={id} />
              <SubmitButton pendingText="…" className={btn("ghost")}>{pl?.status === "completed" ? t("plan.redoPlacement") : t("plan.startPlacement")}</SubmitButton>
            </form>
          )}
        </div>
        {pl?.status === "completed" && <Badge tone="success">{t("plan.placementResult", { level: pl.suggested_level })}</Badge>}
        {plan ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {plan.status === "draft" ? <Badge tone="warning">{t("plan.draft")}</Badge> : <Badge tone="success">{t("plan.approved")}</Badge>}
              {plan.scope_label && <ScopeChip>{plan.scope_label}</ScopeChip>}
              {plan.milestone_label && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{plan.milestone_label}</span>}
            </div>
            <PlanView
              title={plan.title}
              items={planItemsEn}
              skills={SKILLS.map((s) => ({ value: s, label: tc(`skills.${s}`) }))}
            />
            {plan.status === "draft" && (
              <form action={approvePlan}>
                <input type="hidden" name="planId" value={plan.id} />
                <SubmitButton pendingText="…" className={btn("success")}>{t("plan.approvePlan")}</SubmitButton>
              </form>
            )}
            <details style={{ borderTop: "1px solid var(--ink-100)", paddingTop: 8 }}>
              <summary style={{ fontSize: 12, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>{t("plan.regenSummary")}</summary>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0", lineHeight: 1.6 }}>
                {t("plan.regenHint")}{plan.status === "approved" && t("plan.regenHintApproved")}
              </p>
              <form action={startPlanFromCatalog}>
                <input type="hidden" name="learnerId" value={id} />
                <SubmitButton pendingText="…" className={btn("secondary")}>{t("plan.buildFromCatalog")}</SubmitButton>
              </form>
            </details>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7 }}>{t("plan.emptyIntro")}</p>
            <form action={startPlanFromCatalog}>
              <input type="hidden" name="learnerId" value={id} />
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.6 }}>{t("plan.buildFromCatalogHint")}</p>
              <SubmitButton pendingText="…" className={btn("primary")}>{t("plan.buildFromCatalog")}</SubmitButton>
            </form>
          </div>
        )}
      </Card>
    </div>
  );

  const Curriculum = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>{t("curriculum.title")}</div>
        {(resources ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("curriculum.empty")}</p>}
        {(resources ?? []).map((r: any) => {
          const href = resourceUrls.get(r.id);
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, borderBottom: "1px solid var(--ink-100)", paddingBottom: 6 }}>
              <Badge tone="neutral">{fileKind(r.file_name, r.mime_type)}</Badge>
              <span style={{ flex: 1, minWidth: 0 }}>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 600 }}>{r.title ?? r.file_name} ↓</a>
                ) : (
                  <span style={{ color: "var(--text-body)" }}>{r.title ?? r.file_name}</span>
                )}
                {r.size_bytes != null && <span style={{ color: "var(--text-muted)" }}> · {fmtSize(r.size_bytes)}</span>}
                {r.note && <span style={{ color: "var(--text-muted)" }}> — {r.note}</span>}
              </span>
              <form action={removeResource}><input type="hidden" name="resourceId" value={r.id} /><input type="hidden" name="learnerId" value={id} /><SubmitButton className={btn("ghost")}>✕</SubmitButton></form>
            </div>
          );
        })}
        <form action={addResource} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end", borderTop: "1px solid var(--ink-100)", paddingTop: 10 }}>
          <input type="hidden" name="learnerId" value={id} />
          <input name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className={ctl} style={{ width: "auto", flex: 1, minWidth: 200 }} />
          <input name="title" placeholder={t("curriculum.titlePlaceholder")} className={ctl} style={{ width: "auto" }} />
          <input name="note" placeholder={t("curriculum.notePlaceholder")} className={ctl} style={{ width: "auto" }} />
          <SubmitButton pendingText={t("curriculum.uploading")} className={btn("secondary")}>{t("curriculum.upload")}</SubmitButton>
        </form>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("curriculum.formats")}</p>
      </Card>
    </div>
  );

  const restUpcoming = upcoming.slice(1);
  const Sessions = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* HERO: the next session, front and center — one-click join */}
      {nextSession ? (
        <Card style={{ display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(135deg, var(--brand-50, #f1ecff), var(--surface-card))", border: "1.5px solid var(--brand-200, #d8ccff)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--brand)" }}>{t("sessions.heroNext")}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(nextSession.scheduled_at)}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {t("sched.minutes", { n: nextSession.duration_minutes })}</span>
            {nextSession.lesson_title && <Badge tone="neutral">{nextSession.lesson_title}</Badge>}
          </div>
          <VideoCall sessionId={nextSession.id} />
        </Card>
      ) : (
        <Card><p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("sessions.heroNone")}</p></Card>
      )}

      {restUpcoming.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--leaf-700)" }}>{t("sessions.otherUpcoming", { n: restUpcoming.length })}</p>
          {restUpcoming.map((s: any) => <SessionCard key={s.id} s={s} />)}
        </div>
      )}
      {past.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>{t("sessions.pastWriteReport", { n: past.length })}</p>
          {past.map((s: any) => <SessionCard key={s.id} s={s} showReport />)}
        </div>
      )}
      {(sessions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("sessions.empty")}</p>}

      {/* Scheduling tools — used occasionally, so tucked away at the bottom */}
      <details style={{ borderRadius: 14, border: "1px solid var(--border-soft)", background: "var(--surface-card)", padding: "10px 14px" }}>
        <summary style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", cursor: "pointer" }}>{t("sessions.schedTitle")}</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {/* Recurring weekly lesson slots — constrained to the teacher's availability windows */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={secTitle}>{t("sessions.weeklyTitle")}</div>
            {(availRules ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("sessions.weeklyNoAvail")}</p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("sessions.weeklyHint")}</p>
                {WEEKDAY_EN.map((label, wd) => {
                  const options = availByWeekday.get(wd) ?? [];
                  if (options.length === 0) return null;
                  return (
                    <div key={wd} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", width: 56, flexShrink: 0 }}>{label}</span>
                      {options.map((o) => {
                        const existing = slotByKey.get(`${wd}|${o.time}`);
                        return existing ? (
                          <form key={o.time} action={removeLessonSlot}>
                            <input type="hidden" name="slotId" value={existing.id} />
                            <input type="hidden" name="learnerId" value={id} />
                            <SubmitButton className="ward-btn ward-btn--primary ward-btn--sm" pendingText="…">{o.time} ✕</SubmitButton>
                          </form>
                        ) : (
                          <form key={o.time} action={addLessonSlot}>
                            <input type="hidden" name="learnerId" value={id} />
                            <input type="hidden" name="weekday" value={wd} />
                            <input type="hidden" name="time" value={o.time} />
                            <input type="hidden" name="duration" value={o.duration} />
                            <SubmitButton className="ward-btn ward-btn--ghost ward-btn--sm" pendingText="…">{o.time}</SubmitButton>
                          </form>
                        );
                      })}
                    </div>
                  );
                })}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--ink-100)", paddingTop: 8 }}>
                  <form action={generateLessonSessions}>
                    <input type="hidden" name="learnerId" value={id} />
                    <SubmitButton pendingText="…" className={btn("soft")}>{t("sessions.generateSessions")}</SubmitButton>
                  </form>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("sessions.generateSessionsHint")}</span>
                </div>
              </>
            )}
          </Card>

          {/* One-off extra session */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={secTitle}>{t("sessions.extraTitle")}</div>
            <SessionScheduleForm learnerId={id} planItems={planItemsEn.map((it: any, i: number) => ({ index: i, label: it.description }))} />
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("sessions.extraHint")}</p>
          </Card>
        </div>
      </details>
    </div>
  );

  const Homework = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Create a digital homework with AI → approve → assign to a session below */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={secTitle}>{t("homework.createTitle")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}><Spark size={13} /> {t("homework.createBadge")}</span>
        </div>
        {(objectives ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("homework.needPlan")}</p>
        ) : (
          <form action={generateDraft} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
            <input type="hidden" name="learnerId" value={id} />
            <select name="objectiveId" required defaultValue="" className={sel} style={{ width: "auto", minHeight: 40, flex: 1, minWidth: 160, maxWidth: 280 }}>
              <option value="" disabled>{t("homework.objectivePlaceholder")}</option>
              {(objectivesEn ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.level ? `${o.level} · ` : ""}{o.description}</option>)}
            </select>
            <select name="format" defaultValue="multiple_choice" className={sel} style={{ width: "auto", minHeight: 40 }}>
              {ITEM_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
            </select>
            <select name="difficulty" defaultValue="easy" className={sel} style={{ width: "auto", minHeight: 40 }}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <SubmitButton pendingText="…" className={btn("soft")}>{t("homework.generateDraft")}</SubmitButton>
          </form>
        )}
      </Card>

      {(draftItems ?? []).length > 0 && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={secTitle}>{t("homework.draftsTitle")}</span>
            <AITrustBadge status="draft" compact />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{(draftItems ?? []).length}</span>
          </div>
          {(draftItems ?? []).map((it: any) => (
            <ItemCard
              key={it.id}
              it={it}
              right={
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={approveItem}><input type="hidden" name="itemId" value={it.id} /><SubmitButton pendingText="…" className={btn("success")}>{t("homework.approve")}</SubmitButton></form>
                  <form action={rejectItem}><input type="hidden" name="itemId" value={it.id} /><SubmitButton pendingText="…" className={btn("ghost")}>{t("homework.reject")}</SubmitButton></form>
                </div>
              }
            />
          ))}
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("homework.draftsHint")}</p>
        </Card>
      )}

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>{t("homework.sessionHwTitle")}</div>
        {(sessions ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("homework.noSessions")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((s: any) => <HwSessionCard key={s.id} s={s} />)}
            {past.map((s: any) => <HwSessionCard key={s.id} s={s} />)}
          </div>
        )}
      </Card>

      {(looseAssigns.length > 0 || looseManual.length > 0) && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={secTitle}>{t("homework.looseTitle")}</div>
          {looseAssigns.map((a: any) => <HomeworkRow key={a.id} a={a} />)}
          {looseManual.map((h: any) => <ManualHwItem key={h.id} h={h} />)}
        </Card>
      )}
    </div>
  );

  const assessmentWaLink = (a: any, result: Record<string, { correct: number; total: number }>) => {
    if (!guardianPhone) return null;
    const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
    const skillLines = Object.entries(result).filter(([sk]) => ["listening", "speaking", "reading", "writing"].includes(sk)).map(([sk, v]) => `• ${waSkillLabel(sk)}: ${v.correct}/${v.total}`).join("\n");
    const text = `*${a.title}*\n${name}\n\n${a.score}/${a.max_score} (${pct}%)\n${skillLines}\n\n${tcwa("appName")}`;
    return `https://wa.me/${guardianPhone}?text=${encodeURIComponent(text)}`;
  };

  const Assessments = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={secTitle}>{t("assessments.genTitle")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}><Spark size={13} /> {t("assessments.genBadge")}</span>
        </div>
        {(curriculumUnits ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("assessments.noCurriculum")}</p>
        ) : (
          <form action={generateAssessmentTest} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
            <input type="hidden" name="learnerId" value={id} />
            <select name="curriculumUnitId" required defaultValue="" className={sel} style={{ width: "auto", flex: 1, minWidth: 160, minHeight: 40 }}>
              <option value="" disabled>{t("assessments.unitPlaceholder")}</option>
              {(curriculumUnits ?? []).map((u: any) => <option key={u.unit_id} value={u.unit_id}>{u.level} · {`⁨${u.title_en ?? u.title_ar}⁩`}</option>)}
            </select>
            <select name="count" defaultValue="8" className={sel} style={{ width: "auto", minHeight: 40 }}>
              {[6, 8, 10, 12].map((n) => <option key={n} value={n}>{t("assessments.questionsCount", { n })}</option>)}
            </select>
            <SubmitButton pendingText="…" className={btn("soft")}><Spark size={14} /> {t("assessments.generate")}</SubmitButton>
          </form>
        )}
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("assessments.genHint")}</p>
      </Card>

      {(assessments ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("assessments.empty")}</p>}
      {(assessments ?? []).map((a: any) => {
        const qs = aqByAssessment.get(a.id) ?? [];
        const result = (a.result ?? null) as Record<string, { correct: number; total: number }> | null;
        const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
        const waLink = a.status === "completed" && result ? assessmentWaLink(a, result) : null;
        return (
          <Card key={a.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span dir="auto" style={{ fontWeight: 700, color: "var(--text-strong)", flex: 1 }}>{a.title}</span>
              {a.status === "draft" && <Badge tone="warning">{t("assessments.draftBadge")}</Badge>}
              {a.status === "ready" && <Badge tone="brand">{t("assessments.readyBadge")}</Badge>}
              {a.status === "completed" && <Badge tone="success">{t("assessments.completedBadge", { score: a.score, max: a.max_score, pct })}</Badge>}
              {a.status === "planned" && <Badge tone="neutral">{t("assessments.plannedBadge")}</Badge>}
              <form action={removeAssessment}><input type="hidden" name="assessmentId" value={a.id} /><input type="hidden" name="learnerId" value={id} /><SubmitButton className={btn("ghost")}>✕</SubmitButton></form>
            </div>

            {a.status === "draft" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("assessments.reviewQuestions", { n: qs.length })}</p>
                {qs.map((q: any, i: number) => (
                  <div key={q.id} style={{ borderRadius: 10, background: "var(--surface-soft)", padding: 10 }}>
                    <p style={{ fontSize: 12.5, color: "var(--text-strong)", display: "flex", gap: 6, flexWrap: "wrap" }}><span style={{ fontWeight: 700 }}>{i + 1}.</span><span dir="ltr" style={{ flex: 1 }}>{q.prompt}</span><Badge tone="neutral">{skillLabel(q.skill)}</Badge></p>
                    <ul dir="ltr" style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      {((q.content?.options ?? []) as string[]).map((o, oi) => {
                        const correct = o === q.answer;
                        return <li key={oi} style={{ fontSize: 12, color: correct ? "var(--leaf-700)" : "var(--text-muted)", fontWeight: correct ? 700 : 400 }}>{correct ? "✓ " : "• "}{o}</li>;
                      })}
                    </ul>
                  </div>
                ))}
                <form action={approveAssessment}>
                  <input type="hidden" name="assessmentId" value={a.id} />
                  <input type="hidden" name="learnerId" value={id} />
                  <SubmitButton pendingText="…" className={btn("success")}>{t("assessments.approve")}</SubmitButton>
                </form>
              </div>
            )}

            {a.status === "ready" && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{t("assessments.waitingStudent")}</p>}

            {a.status === "completed" && result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(result).filter(([sk]) => ["listening", "speaking", "reading", "writing"].includes(sk)).map(([sk, v]) => {
                    const p = v.total ? Math.round((v.correct / v.total) * 100) : 0;
                    const lag = v.total > 0 && v.correct / v.total < 0.5;
                    return (
                      <div key={sk} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-strong)", width: 80, flexShrink: 0 }}>{skillLabel(sk)}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, borderRadius: 999, background: lag ? "var(--apricot-400)" : "var(--brand)" }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums", width: 36, textAlign: "end", flexShrink: 0 }}>{v.correct}/{v.total}</span>
                      </div>
                    );
                  })}
                </div>
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noreferrer" className={btn("success")} style={{ alignSelf: "flex-start", textDecoration: "none" }}>{t("assessments.shareWhatsapp")}</a>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("assessments.noWhatsapp")}</span>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  const Progress = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(plan?.scope_label || plan?.milestone_label) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {plan?.scope_label && <ScopeChip>{plan.scope_label}</ScopeChip>}
          {plan?.milestone_label && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{plan.milestone_label}</span>}
        </div>
      )}
      {/* Four-skill mastery (honest meters) */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <FlowerProgress size={92} skills={skillStats.map((s) => ({ label: skillLabel(s.skill), value: s.fraction, detail: `${s.value.toFixed(1)}/10` }))} />
          </div>
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={secTitle}>{t("progress.skillsTitle")}</div>
            <SkillBars skills={skillStats.map((s) => ({ key: s.skill, label: skillLabel(s.skill), fraction: s.fraction, value: s.value, total: s.total }))} />
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("progress.skillsNote")}</p>
      </Card>

      {lagging.length > 0 && (
        <Card variant="soft" style={{ borderColor: "var(--apricot-300)", background: "var(--apricot-100, #ffeedc)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--apricot-600, #c97a2b)", marginBottom: 4 }}>{t("progress.whereToHelp")}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-body)", lineHeight: 1.7 }}>{t("progress.weakest")} <strong>{lagging.join(", ")}</strong>{t("progress.weakestHint")}</div>
        </Card>
      )}

      {/* Unit blooms + per-objective teacher assessment (feeds the decaying average) */}
      {startedUnits.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("progress.noAssessments")}</p></Card>
      ) : (
        startedUnits.map((u) => (
          <Card key={u.unit_id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UnitBloom value={u.value} size={34} />
              <div style={{ flex: 1 }}>
                <div dir="auto" style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{u.title_en ?? u.title_ar}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{u.level} · {t("progress.unitBloom", { value: u.value.toFixed(1), n: u.assessedCount, total: u.total })}</div>
              </div>
            </div>
            {/* §6.2 drill-down: UNIT → 4 SKILL petals → (click) that skill's objectives →
                (click) the objective's evidence log. Read-only · teacher diagnostic. Values are
                already computed by evidenceBloom (objective = mean of its evidence; skill-in-unit
                = simple mean of that skill's objectives). */}
            {SKILLS.map((skill) => {
              const skillObjs = u.objectives.filter((o) => o.skill === skill);
              if (skillObjs.length === 0) return null;
              const skillVal = meanOf(skillObjs.map((o) => o.value));
              const skillState = stageForValue(skillVal);
              return (
                <details key={skill} style={{ borderTop: "1px solid var(--ink-100)", paddingTop: 6 }}>
                  <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <SkillBars skills={[{ key: skill, label: skillLabel(skill), fraction: Math.max(0, Math.min(1, skillVal / 10)), value: skillVal, total: skillObjs.length }]} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{t(`progress.state${cap(skillState)}`)}</span>
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0 2px 10px" }}>
                    {skillObjs.map((o) => {
                      const ev = evidenceByObjective.get(o.objective_id) ?? [];
                      return (
                        <details key={o.objective_id} style={{ borderInlineStart: "2px solid var(--ink-100)", paddingInlineStart: 8 }}>
                          <summary style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5 }}>
                            {/* descriptor shown ONCE (the previous double-render via the petal label was removed) */}
                            <span dir="auto" style={{ flex: 1, color: o.assessed ? "var(--text-body)" : "var(--text-muted)" }}>{o.descriptor_en ?? o.descriptor_ar}</span>
                            <span style={{ fontSize: 11.5, color: o.assessed ? "var(--text-muted)" : "var(--text-faint)", whiteSpace: "nowrap" }}>
                              {o.assessed ? `${t("progress.current")}: ${t(`progress.state${cap(o.state)}`)} · ${o.value.toFixed(1)}/10` : t("progress.notAssessed")}
                            </span>
                          </summary>
                          {ev.length === 0 ? (
                            <p style={{ fontSize: 11.5, color: "var(--text-faint)", padding: "4px 0 4px 8px", margin: 0 }}>{t("progress.noEvidence")}</p>
                          ) : (
                            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 3, padding: "4px 0 4px 8px", margin: 0 }}>
                              {ev.map((e, ei) => {
                                const st = stageForValue(Number(e.value));
                                return (
                                  <li key={ei} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11.5, color: "var(--text-muted)" }}>
                                    <span style={{ fontWeight: 700, color: "var(--text-brand)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{t(`progress.state${cap(st)}`)} · {Number(e.value).toFixed(1)}/10</span>
                                    <span style={{ flex: 1 }}>{t(`progress.evidenceSource.${e.source}`)}</span>
                                    <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{evDate(e.created_at)}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </Card>
        ))
      )}
    </div>
  );

  const tabs: StudentTab[] = [
    { key: "overview", label: t("tabs.overview"), content: Overview },
    { key: "curriculum", label: t("tabs.curriculum"), content: Curriculum },
    { key: "plan", label: t("tabs.plan"), content: Plan },
    { key: "sessions", label: t("tabs.sessions"), badge: upcoming.length || undefined, content: Sessions },
    { key: "homework", label: t("tabs.homework"), content: Homework },
    { key: "assessments", label: t("tabs.assessments"), content: Assessments },
    { key: "progress", label: t("tabs.progress"), content: Progress },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/studio/students" className={btn("ghost")} style={{ alignSelf: "flex-start" }}>{t("backToStudents")}</Link>

      {/* Header with live signals */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Avatar name={name} size={48} />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{name}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {pl?.status === "completed" ? <Badge tone="success">{t("level", { level: pl.suggested_level })}</Badge> : pl?.status === "in_progress" ? <Badge tone="warning">{t("placementInProgress")}</Badge> : <Badge tone="neutral">{t("noPlacement")}</Badge>}
              {plan && (plan.status === "approved" ? <Badge tone="success">{t("planApproved")}</Badge> : <Badge tone="warning">{t("planDraft")}</Badge>)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>{overall}%</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("overallProgress")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--ink-100)", paddingTop: 10 }}>
          <span style={{ fontSize: 12.5, color: nextSession ? "var(--leaf-700)" : "var(--text-muted)" }}>
            {nextSession ? t("nextLabel", { time: fmtUTC(nextSession.scheduled_at) }) : t("noUpcoming")}
          </span>
          {alerts.map((a, i) => <Badge key={i} tone={a.tone}>{a.label}</Badge>)}
        </div>
      </Card>

      <StudentTabs tabs={tabs} />
    </div>
  );
}
