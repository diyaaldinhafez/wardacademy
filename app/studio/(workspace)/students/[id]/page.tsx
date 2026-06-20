/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  startPlacement, startPlan, startPlanFromIndex, createManualPlan, addPlanLesson, removePlanLesson, approvePlan, draftReportWithAI, assignItem,
  addResource, removeResource, createAssessment, recordAssessment, removeAssessment,
  generateDraft, approveItem, rejectItem, updateReport, approveReport,
  addLessonSlot, removeLessonSlot, generateLessonSessions,
  createManualHomework, gradeManualHomework, removeManualHomework,
  generateDiagnosticReport, updateDiagnostic, approveDiagnostic,
  setSkillAssessment,
} from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SessionScheduleForm from "@/components/studio/SessionScheduleForm";
import StudentTabs, { type StudentTab } from "@/components/studio/StudentTabs";
import ItemCard from "@/components/studio/ItemCard";
import VideoCall from "@/components/VideoCall";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { petalValues, SKILL_AR, SKILLS, unitStage, SPEAKING_LEVELS } from "@/lib/skills";
import { UnitBloom, FlowerProgress, ScopeChip } from "@/components/bloom/Bloom";
import { FORMAT_LABELS, ITEM_FORMATS, DIFFICULTIES } from "@/lib/items";
import { WEEKDAY_AR } from "@/lib/availability";
import { fmtUTC } from "@/lib/datetime";

const objOf = (o: any) => (Array.isArray(o) ? o[0] : o) ?? {};
const one = (o: any) => (Array.isArray(o) ? o[0] : o);
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const ctl = "ward-field__control";
const sel = "ward-select__control";
const secTitle = { fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" } as const;
const SCOPE_AR: Record<string, string> = { unit: "وحدة", term: "فصل", plan: "الخطّة كاملة" };

const fmtSize = (n?: number | null) => (n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} م.ب` : `${Math.max(1, Math.round(n / 1024))} ك.ب`);
function fileKind(name?: string | null, mime?: string | null): string {
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mime?.includes("pdf")) return "PDF";
  if (["doc", "docx"].includes(ext) || mime?.includes("word")) return "Word";
  if (["ppt", "pptx"].includes(ext) || mime?.includes("presentation") || mime?.includes("powerpoint")) return "PowerPoint";
  if (["xls", "xlsx"].includes(ext) || mime?.includes("sheet") || mime?.includes("excel")) return "Excel";
  if (ext === "txt") return "نصّ";
  return "ملفّ";
}

function subStatus(sub: any) {
  if (!sub) return { tone: "neutral" as const, label: "لم يُسلَّم" };
  if (!sub.graded) return { tone: "warning" as const, label: "بانتظار التصحيح" };
  if (!sub.counts_toward_mastery) return { tone: "brand" as const, label: "أُنجز" };
  return sub.is_correct ? { tone: "success" as const, label: "صحيح" } : { tone: "danger" as const, label: "يحتاج مراجعة" };
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

  const { data: pl } = await supabase.from("placement_tests").select("status, suggested_level, created_at").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: plan } = await supabase.from("study_plans").select("id, title, level, items, status, track, scope_label, milestone_label").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const planItems: any[] = (plan?.items as any[]) ?? [];
  // Group plan lessons into their units, keeping each lesson's global index.
  const planGroups: { unit: string; lessons: { it: any; i: number }[] }[] = [];
  planItems.forEach((it, i) => {
    const unit = (it.unit as string) || "دروس";
    let g = planGroups[planGroups.length - 1];
    if (!g || g.unit !== unit) { g = { unit, lessons: [] }; planGroups.push(g); }
    g.lessons.push({ it, i });
  });

  const { data: prog } = await supabase.from("progress_records").select("attempts, correct, completions, objectives(description, level, skill, unit)").eq("learner_id", id);
  const rows = (prog ?? []) as any[];
  const petals = petalValues(rows.map((r) => ({ attempts: r.attempts, correct: r.correct, skill: objOf(r.objectives).skill })));
  const overall = petals.length ? Math.round(petals.reduce((a, p) => a + p.value, 0) / petals.length) : 0;

  // Bloom Map: per-skill honest meters (% of mastered objectives) + objectives grouped by unit.
  const isMastered = (r: any) => r.attempts >= 1 && r.correct / Math.max(1, r.attempts) >= 0.6;
  const skillStats = SKILLS.map((sk) => {
    const inSkill = rows.filter((r) => objOf(r.objectives).skill === sk);
    return { skill: sk, total: inSkill.length, mastered: inSkill.filter(isMastered).length };
  });
  const lagging = skillStats.filter((s) => s.total > 0 && s.mastered / s.total < 0.5).map((s) => SKILL_AR[s.skill]);
  const rowsByUnit = new Map<string, any[]>();
  for (const r of rows) {
    const u = (objOf(r.objectives).unit as string) || "دروس";
    const arr = rowsByUnit.get(u) ?? [];
    arr.push(r);
    rowsByUnit.set(u, arr);
  }
  const { data: skillAssess } = await supabase.from("skill_assessments").select("skill, value, label").eq("learner_id", id);
  const speakingAssess = (skillAssess ?? []).find((a: any) => a.skill === "speaking") as { value: number; label: string | null } | undefined;
  const skillValue = (sk: string, mastered: number, total: number) => (sk === "speaking" ? speakingAssess?.value ?? 0 : total ? mastered / total : 0);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, lesson_title, plan_item_index, session_reports(id, status, summary, strengths, improve)")
    .eq("learner_id", id)
    .order("scheduled_at", { ascending: true });
  const nowIso = new Date().toISOString();
  const upcoming = (sessions ?? []).filter((s: any) => s.status === "scheduled" && s.scheduled_at >= nowIso);
  const past = (sessions ?? []).filter((s: any) => !(s.status === "scheduled" && s.scheduled_at >= nowIso));
  const nextSession = upcoming[0];
  const taughtIdx = new Set<number>((sessions ?? []).map((s: any) => s.plan_item_index).filter((n: any) => n != null));

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
    .select("id, prompt, content, format, difficulty, status, item_keys(answer, explanation, rubric), objectives(description, level)")
    .eq("status", "draft").eq("target_learner_id", id)
    .order("created_at", { ascending: false });
  // The tenant's objectives — the bank the teacher generates homework from.
  const { data: objectives } = await supabase.from("objectives").select("id, description, level").order("created_at", { ascending: false });
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
  const { data: assessments } = await supabase.from("assessments").select("id, title, scope, status, score, max_score, notes, scheduled_for, completed_at").eq("learner_id", id).order("created_at", { ascending: false });
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
  const HW_KIND_AR: Record<string, string> = { prompt: "صورة الواجب", worksheet: "ورقة عمل", submission: "حلّ الطالب" };

  // Alerts
  const pastNoReport = past.filter((s: any) => !one(s.session_reports)).length;
  const ungraded = (subs ?? []).filter((s: any) => !s.graded).length;
  const noApprovedPlan = !plan || plan.status !== "approved";
  const alerts: { tone: "danger" | "warning" | "neutral"; label: string }[] = [];
  if (noApprovedPlan) alerts.push({ tone: "warning", label: "لا خطّة معتمَدة" });
  if (pastNoReport) alerts.push({ tone: "danger", label: `${pastNoReport} جلسة بلا تقرير` });
  if (ungraded) alerts.push({ tone: "warning", label: `${ungraded} واجب بانتظار التصحيح` });

  // ————— Reusable bits —————
  const HomeworkRow = ({ a }: { a: any }) => {
    const it = one(a.items);
    if (!it) return null;
    const st = subStatus(subByItem.get(it.id));
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
        <span style={{ color: "var(--text-body)", flex: 1 }}>{it.prompt}</span>
        <Badge tone="neutral">{FORMAT_LABELS[it.format as keyof typeof FORMAT_LABELS] ?? it.format}</Badge>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
    );
  };

  const AssignToSession = ({ sessionId }: { sessionId: string }) =>
    (approvedItems ?? []).length === 0 ? null : (
      <form action={assignItem} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="learnerId" value={id} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <select name="itemId" required defaultValue="" className={sel} style={{ width: "auto", minHeight: 34, maxWidth: 220, fontSize: 12.5 }}>
          <option value="" disabled>أسنِد واجباً رقمياً…</option>
          {(approvedItems ?? []).map((it: any) => <option key={it.id} value={it.id}>{it.prompt.slice(0, 40)}</option>)}
        </select>
        <SubmitButton pendingText="…" className={btn("ghost")}>أضِف</SubmitButton>
      </form>
    );

  // A manual homework: teacher files, the student's uploaded solution, grading.
  const ManualHwItem = ({ h }: { h: any }) => {
    const tFiles = (h.homework_files ?? []).filter((f: any) => f.kind !== "submission");
    const subFiles = (h.homework_files ?? []).filter((f: any) => f.kind === "submission");
    const tone = h.status === "graded" ? "success" : h.status === "submitted" ? "warning" : "neutral";
    const label = h.status === "graded" ? `مُصحَّح${h.score != null ? `: ${h.score}${h.max_score != null ? `/${h.max_score}` : ""}` : ""}` : h.status === "submitted" ? "بانتظار التصحيح" : "بانتظار حلّ الطالب";
    return (
      <div style={{ borderRadius: 10, background: "var(--surface-soft)", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="brand">يدويّ</Badge>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", flex: 1 }}>{h.title}</span>
          <Badge tone={tone}>{label}</Badge>
          <form action={removeManualHomework}><input type="hidden" name="manualHomeworkId" value={h.id} /><input type="hidden" name="learnerId" value={id} /><SubmitButton className={btn("ghost")}>✕</SubmitButton></form>
        </div>
        {h.instructions && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{h.instructions}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[...tFiles, ...subFiles].map((f: any) => {
            const href = hwFileUrls.get(f.id);
            return href ? (
              <a key={f.id} href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: f.kind === "submission" ? "var(--leaf-700)" : "var(--brand)", textDecoration: "none", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "3px 8px" }}>
                {HW_KIND_AR[f.kind]} ↓
              </a>
            ) : null;
          })}
        </div>
        {h.status === "submitted" && (
          <form action={gradeManualHomework} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
            <input type="hidden" name="manualHomeworkId" value={h.id} />
            <input type="hidden" name="learnerId" value={id} />
            <input name="score" type="number" placeholder="الدرجة" className={ctl} style={{ width: 90 }} />
            <input name="maxScore" type="number" placeholder="من" className={ctl} style={{ width: 80 }} />
            <input name="feedback" placeholder="ملاحظة" className={ctl} style={{ width: "auto", flex: 1, minWidth: 120 }} />
            <SubmitButton pendingText="…" className={btn("success")}>صحّح</SubmitButton>
          </form>
        )}
        {h.status === "graded" && h.feedback && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>ملاحظة: {h.feedback}</p>}
      </div>
    );
  };

  const ManualHwCreate = ({ sessionId }: { sessionId: string | null }) => (
    <details>
      <summary style={{ fontSize: 12.5, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>+ واجبٌ يدويّ (من الكتاب)</summary>
      <form action={createManualHomework} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        <input type="hidden" name="learnerId" value={id} />
        {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
        <input name="title" required placeholder="عنوان الواجب" className={ctl} />
        <input name="instructions" placeholder="تعليمات (اختياري)" className={ctl} />
        <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>صورة الواجب من الكتاب (مطلوبة)</label>
        <input name="prompt" type="file" required accept="image/*,.pdf" className={ctl} />
        <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>أوراق عمل (اختياري، متعدّدة)</label>
        <input name="worksheets" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" className={ctl} />
        <SubmitButton pendingText="جارٍ الرفع…" className={btn("secondary")}>أنشئ الواجب اليدويّ</SubmitButton>
      </form>
    </details>
  );

  const SessionCard = ({ s }: { s: any }) => {
    const report = one(s.session_reports);
    const hw = assignsBySession.get(s.id) ?? [];
    const mhw = manualBySession.get(s.id) ?? [];
    return (
      <div style={{ borderRadius: 12, border: "1px solid var(--border-soft)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(s.scheduled_at)}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {s.duration_minutes}د</span>
          <Badge tone={s.status === "completed" ? "success" : s.status === "scheduled" ? "brand" : "neutral"}>{s.status}</Badge>
        </div>
        {s.lesson_title && <div style={{ fontSize: 13, color: "var(--text-body)" }}>📖 الدرس: <strong>{s.lesson_title}</strong></div>}
        {s.status === "scheduled" && <VideoCall sessionId={s.id} />}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>الواجب</span>
          {hw.length === 0 && mhw.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا واجب لهذه الجلسة.</span>}
          {hw.map((a: any) => <HomeworkRow key={a.id} a={a} />)}
          {mhw.map((h: any) => <ManualHwItem key={h.id} h={h} />)}
          <AssignToSession sessionId={s.id} />
          <ManualHwCreate sessionId={s.id} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--ink-100)", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>التقرير</span>
            {!report && (
              <form action={draftReportWithAI} style={{ marginInlineStart: "auto" }}>
                <input type="hidden" name="sessionId" value={s.id} />
                <SubmitButton pendingText="…" className={btn("soft")}><Spark size={13} /> ولّد بالذكاء</SubmitButton>
              </form>
            )}
            {report?.status === "approved" && <span style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 6 }}><AITrustBadge status="approved" compact /><span style={{ fontSize: 12, color: "var(--leaf-700)" }}>ظاهرٌ للعائلة</span></span>}
          </div>
          {report?.status === "draft" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
              <AITrustBadge status="draft" />
              <form action={updateReport} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input type="hidden" name="reportId" value={report.id} />
                <textarea name="summary" required rows={2} defaultValue={report.summary ?? ""} className={ctl} placeholder="ملخّص" />
                <input name="strengths" defaultValue={report.strengths ?? ""} className={ctl} placeholder="نقاط القوة" />
                <input name="improve" defaultValue={report.improve ?? ""} className={ctl} placeholder="للتحسين" />
                <SubmitButton pendingText="…" className={btn("secondary")}>احفظ التعديلات</SubmitButton>
              </form>
              <form action={approveReport}>
                <input type="hidden" name="reportId" value={report.id} />
                <SubmitButton pendingText="…" className={btn("success")}>اعتمِد — يظهر للعائلة</SubmitButton>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ————— Tab contents —————
  const Overview = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Diagnostic (baseline) — generated from all the student's inputs */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secTitle}>تقرير التشخيص</span>
          {diagnostic?.status === "approved" && <AITrustBadge status="approved" compact />}
          {diagnostic?.status === "draft" && <AITrustBadge status="draft" compact />}
          <form action={generateDiagnosticReport} style={{ marginInlineStart: "auto" }}>
            <input type="hidden" name="learnerId" value={id} />
            <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}><Spark size={13} /> {diagnostic ? "أعِد التوليد" : "ولّد التشخيص"}</SubmitButton>
          </form>
        </div>
        {!diagnostic && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>يُولَّد من نموذج التسجيل واختبار التحديد وتقرير الجلسة التعريفية والملاحظات الداخلية — نقطة انطلاقك.</p>}
        {diagnostic?.status === "draft" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
            <form action={updateDiagnostic} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input type="hidden" name="learnerId" value={id} />
              <textarea name="report" rows={8} defaultValue={diagnostic.report ?? ""} className={ctl} style={{ lineHeight: 1.7 }} />
              <SubmitButton pendingText="…" className={btn("secondary")}>احفظ التعديلات</SubmitButton>
            </form>
            <form action={approveDiagnostic}>
              <input type="hidden" name="learnerId" value={id} />
              <SubmitButton pendingText="…" className={btn("success")}>اعتمِد التشخيص</SubmitButton>
            </form>
          </div>
        )}
        {diagnostic?.status === "approved" && (
          <p style={{ fontSize: 13.5, color: "var(--text-body)", whiteSpace: "pre-line", lineHeight: 1.8 }}>{diagnostic.report}</p>
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>الجلسة القادمة</div>
        {nextSession ? (
          <div style={{ fontSize: 13.5, color: "var(--text-body)" }}>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmtUTC(nextSession.scheduled_at)}</strong>
            {nextSession.lesson_title ? <> · 📖 {nextSession.lesson_title}</> : null}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا مواعيد قادمة — جدوِل جلسةً من تبويب «الجلسات».</p>
        )}
      </Card>
      {alerts.length > 0 && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={secTitle}>تنبيهات</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {alerts.map((a, i) => <Badge key={i} tone={a.tone}>{a.label}</Badge>)}
          </div>
        </Card>
      )}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>المهارات الخمس</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {petals.map((p) => (
            <span key={p.name} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "3px 10px" }}>{p.ar} {Math.round(p.value)}%</span>
          ))}
        </div>
      </Card>
    </div>
  );

  const Curriculum = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secTitle}>الخطّة الدراسية</span>
          {pl?.status !== "in_progress" && (
            <form action={startPlacement} style={{ marginInlineStart: "auto" }}>
              <input type="hidden" name="learnerId" value={id} />
              <SubmitButton pendingText="…" className={btn("ghost")}>{pl?.status === "completed" ? "أعِد التحديد" : "ابدأ اختبار التحديد"}</SubmitButton>
            </form>
          )}
        </div>
        {pl?.status === "completed" && <Badge tone="success">نتيجة التحديد: المستوى {pl.suggested_level}</Badge>}
        {plan ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>{plan.title}</span>
              {plan.status === "draft" ? <Badge tone="warning">مسودّة</Badge> : <Badge tone="success">معتمَدة</Badge>}
              {plan.scope_label && <ScopeChip track={plan.track === "school" ? "school" : "cefr"}>{plan.scope_label}</ScopeChip>}
            </div>
            {plan.milestone_label && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>🎯 {plan.milestone_label}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {planGroups.map((g, gi) => {
                const firstUntaught = planItems.findIndex((_, j) => !taughtIdx.has(j));
                return (
                  <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--brand)" }}>{g.unit}</p>
                    {g.lessons.map(({ it, i }) => {
                      const done = taughtIdx.has(i);
                      const current = !done && i === firstUntaught;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "3px 0" }}>
                          <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: done ? "var(--leaf-500)" : current ? "var(--brand)" : "var(--ink-100)", color: done || current ? "#fff" : "var(--text-muted)" }}>{done ? "✓" : i + 1}</span>
                          <span style={{ flex: 1, color: done ? "var(--text-muted)" : "var(--text-body)", textDecoration: done ? "line-through" : "none" }}>{it.level ? `${it.level} · ` : ""}{it.description}</span>
                          {it.skill && SKILL_AR[it.skill as keyof typeof SKILL_AR] && <Badge tone="neutral">{SKILL_AR[it.skill as keyof typeof SKILL_AR]}</Badge>}
                          {current && <Badge tone="brand">الحاليّ</Badge>}
                          {plan.status === "draft" && (
                            <form action={removePlanLesson}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <input type="hidden" name="learnerId" value={id} />
                              <input type="hidden" name="index" value={i} />
                              <SubmitButton className={btn("ghost")}>✕</SubmitButton>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {plan.status === "draft" && (
              <form action={addPlanLesson} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end", borderTop: "1px solid var(--ink-100)", paddingTop: 10 }}>
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="learnerId" value={id} />
                <input name="unit" placeholder="الوحدة" className={ctl} style={{ width: "auto", maxWidth: 140 }} />
                <input name="description" required placeholder="عنوان/وصف الدرس" className={ctl} style={{ width: "auto", flex: 1, minWidth: 160 }} />
                <select name="skill" defaultValue="" className={sel} style={{ width: "auto", minHeight: 40 }}>
                  <option value="">المهارة…</option>
                  {SKILLS.map((s) => <option key={s} value={s}>{SKILL_AR[s]}</option>)}
                </select>
                <input name="level" placeholder="المستوى" className={ctl} style={{ width: "auto", maxWidth: 90 }} />
                <SubmitButton pendingText="…" className={btn("secondary")}>أضِف درساً</SubmitButton>
              </form>
            )}
            {plan.status === "draft" && (
              <form action={approvePlan}>
                <input type="hidden" name="planId" value={plan.id} />
                <SubmitButton pendingText="…" className={btn("success")}>اعتمِد الخطّة — تصبح أهدافاً قابلةً للتدريس</SubmitButton>
              </form>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
              ارفع <strong>فهرس المنهاج</strong> (صورة / PDF / نصّ) — يقرؤه الذكاء ويستخرج منه وحدات المنهج ودروسه <strong>بدقّةٍ بلا تأليف</strong>.
            </p>
            <form action={startPlanFromIndex} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
              <input type="hidden" name="learnerId" value={id} />
              <div>
                <label style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>المسار</label>
                <select name="track" defaultValue="cefr" className={sel} style={{ width: "auto", minHeight: 40 }}>
                  <option value="cefr">CEFR (منهاج وَرد)</option>
                  <option value="school">منهج المدرسة (تقوية)</option>
                </select>
              </div>
              <input name="grade" placeholder="الصفّ/المستوى" className={ctl} style={{ width: "auto", maxWidth: 120 }} />
              <input name="term" placeholder="الفصل" className={ctl} style={{ width: "auto", maxWidth: 110 }} />
              <input name="index" type="file" required accept="image/*,.pdf,.txt,.md,.csv" className={ctl} style={{ width: "auto", flex: 1, minWidth: 180 }} />
              <SubmitButton pendingText="جارٍ القراءة والتوليد…" className={btn("soft")}><Spark size={14} /> ولّد من الفهرس</SubmitButton>
            </form>
            <details>
              <summary style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>أو ولّد من المستوى فقط (بلا فهرس)</summary>
              <form action={startPlan} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end", marginTop: 8 }}>
                <input type="hidden" name="learnerId" value={id} />
                <select name="track" defaultValue="cefr" className={sel} style={{ width: "auto", minHeight: 40 }}>
                  <option value="cefr">CEFR</option>
                  <option value="school">مدرسيّ</option>
                </select>
                <input name="grade" placeholder="الصفّ (للمدرسيّ)" className={ctl} style={{ width: "auto", maxWidth: 130 }} />
                <input name="term" placeholder="الفصل" className={ctl} style={{ width: "auto", maxWidth: 110 }} />
                <SubmitButton pendingText="…" className={btn("ghost")}>ولّد بالذكاء</SubmitButton>
              </form>
            </details>
            <details>
              <summary style={{ fontSize: 12, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>أو أنشئ خطّةً يدويةً بالكامل</summary>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0", lineHeight: 1.6 }}>أنشئ الخطّة فارغةً ثمّ أضِف وحداتها ودروسها يدوياً بالتفصيل.</p>
              <form action={createManualPlan} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
                <input type="hidden" name="learnerId" value={id} />
                <input name="title" required placeholder="عنوان الخطّة/المنهاج" className={ctl} style={{ width: "auto", flex: 1, minWidth: 160 }} />
                <select name="track" defaultValue="cefr" className={sel} style={{ width: "auto", minHeight: 40 }}>
                  <option value="cefr">CEFR</option>
                  <option value="school">مدرسيّ</option>
                </select>
                <input name="grade" placeholder="الصفّ (للمدرسيّ)" className={ctl} style={{ width: "auto", maxWidth: 130 }} />
                <input name="term" placeholder="الفصل" className={ctl} style={{ width: "auto", maxWidth: 110 }} />
                <SubmitButton pendingText="…" className={btn("secondary")}>أنشئ خطّةً يدوية</SubmitButton>
              </form>
            </details>
          </div>
        )}
      </Card>

      {/* Create homework with AI (targets this student) */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={secTitle}>إنشاء واجبٍ بالذكاء</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}><Spark size={13} /> مسودّةٌ تُراجِعها قبل الإرسال</span>
        </div>
        {(objectives ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>أضِف أهداف الخطّة أولاً («أضِف الأهداف للمنهاج»).</p>
        ) : (
          <form action={generateDraft} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
            <input type="hidden" name="learnerId" value={id} />
            <select name="objectiveId" required defaultValue="" className={sel} style={{ width: "auto", minHeight: 40, flex: 1, minWidth: 160, maxWidth: 280 }}>
              <option value="" disabled>الهدف…</option>
              {(objectives ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.level ? `${o.level} · ` : ""}{o.description}</option>)}
            </select>
            <select name="format" defaultValue="multiple_choice" className={sel} style={{ width: "auto", minHeight: 40 }}>
              {ITEM_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
            </select>
            <select name="difficulty" defaultValue="easy" className={sel} style={{ width: "auto", minHeight: 40 }}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}>ولّد مسودّة</SubmitButton>
          </form>
        )}
      </Card>

      {/* Drafts awaiting approval */}
      {(draftItems ?? []).length > 0 && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={secTitle}>مسودّاتٌ بانتظار اعتمادك</span>
            <AITrustBadge status="draft" compact />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{(draftItems ?? []).length}</span>
          </div>
          {(draftItems ?? []).map((it: any) => (
            <ItemCard
              key={it.id}
              it={it}
              right={
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={approveItem}><input type="hidden" name="itemId" value={it.id} /><SubmitButton pendingText="…" className={btn("success")}>اعتمِد</SubmitButton></form>
                  <form action={rejectItem}><input type="hidden" name="itemId" value={it.id} /><SubmitButton pendingText="…" className={btn("ghost")}>ارفض</SubmitButton></form>
                </div>
              }
            />
          ))}
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>بعد الاعتماد تُسنِدها لجلسةٍ من تبويب «الجلسات».</p>
        </Card>
      )}

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>مصادر التعلّم</div>
        {(resources ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا مصادر بعد — ارفع ملفّاً (PDF / Word / PowerPoint / Excel).</p>}
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
          <input name="title" placeholder="عنوان (اختياري)" className={ctl} style={{ width: "auto" }} />
          <input name="note" placeholder="ملاحظة (اختياري)" className={ctl} style={{ width: "auto" }} />
          <SubmitButton pendingText="جارٍ الرفع…" className={btn("secondary")}>ارفع ملفاً</SubmitButton>
        </form>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>PDF · Word · PowerPoint · Excel · نصّ — حتى 25 ميغابايت. خاصّةٌ ومعزولة.</p>
      </Card>
    </div>
  );

  const Sessions = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Recurring weekly lesson slots — constrained to the teacher's availability windows */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>مواعيد الجلسات الأسبوعية المتكرّرة</div>
        {(availRules ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>حدّدي تفرّغك أولاً من صفحة «تفرّغي»، ثمّ اختاري المواعيد من ضمنه.</p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>اختاري المواعيد من ضمن تفرّغك (المُختار باللون البنفسجيّ — اضغطيه للحذف):</p>
            {WEEKDAY_AR.map((label, wd) => {
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
                <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}>ولّد جلسات الخطّة</SubmitButton>
              </form>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>يجدول دروس الخطّة على المواعيد المختارة بالتسلسل، ويربط كلّ جلسةٍ بدرسها.</span>
            </div>
          </>
        )}
      </Card>

      {/* One-off extra session */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>جلسةٌ إضافية (مفردة)</div>
        <SessionScheduleForm learnerId={id} planItems={planItems.map((it: any, i: number) => ({ index: i, label: it.description }))} />
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>يُدخَل بتوقيتك المحلّي ويُعرَض بـ UTC.</p>
      </Card>
      {upcoming.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--leaf-700)" }}>القادمة ({upcoming.length})</p>
          {upcoming.map((s: any) => <SessionCard key={s.id} s={s} />)}
        </div>
      )}
      {past.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>السابقة ({past.length})</p>
          {past.map((s: any) => <SessionCard key={s.id} s={s} />)}
        </div>
      )}
      {(sessions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسات بعد.</p>}
      {(looseAssigns.length > 0 || looseManual.length > 0) && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={secTitle}>واجباتٌ غير مرتبطةٍ بجلسة</div>
          {looseAssigns.map((a: any) => <HomeworkRow key={a.id} a={a} />)}
          {looseManual.map((h: any) => <ManualHwItem key={h.id} h={h} />)}
        </Card>
      )}
    </div>
  );

  const Assessments = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>أضِف اختباراً</div>
        <form action={createAssessment} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
          <input type="hidden" name="learnerId" value={id} />
          <input name="title" required placeholder="عنوان الاختبار" className={ctl} style={{ width: "auto", flex: 1, minWidth: 140 }} />
          <select name="scope" defaultValue="unit" className={sel} style={{ width: "auto", minHeight: 40 }}>
            <option value="unit">وحدة</option>
            <option value="term">فصل</option>
            <option value="plan">الخطّة كاملة</option>
          </select>
          <input name="scheduledFor" type="date" dir="ltr" className={ctl} style={{ width: "auto" }} />
          <SubmitButton pendingText="…" className={btn("secondary")}>أضِف</SubmitButton>
        </form>
      </Card>
      {(assessments ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا اختبارات بعد.</p>}
      {(assessments ?? []).map((a: any) => (
        <Card key={a.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "var(--text-strong)", flex: 1 }}>{a.title}</span>
            <Badge tone="neutral">{SCOPE_AR[a.scope] ?? a.scope}</Badge>
            {a.status === "completed" ? <Badge tone="success">مكتمل{a.score != null ? `: ${a.score}${a.max_score != null ? `/${a.max_score}` : ""}` : ""}</Badge> : <Badge tone="warning">مُخطَّط{a.scheduled_for ? ` · ${a.scheduled_for}` : ""}</Badge>}
            <form action={removeAssessment}><input type="hidden" name="assessmentId" value={a.id} /><input type="hidden" name="learnerId" value={id} /><SubmitButton className={btn("ghost")}>✕</SubmitButton></form>
          </div>
          {a.notes && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{a.notes}</p>}
          {a.status !== "completed" && (
            <form action={recordAssessment} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
              <input type="hidden" name="assessmentId" value={a.id} />
              <input type="hidden" name="learnerId" value={id} />
              <input name="score" type="number" placeholder="الدرجة" className={ctl} style={{ width: 90 }} />
              <input name="maxScore" type="number" placeholder="من" className={ctl} style={{ width: 80 }} />
              <input name="notes" placeholder="ملاحظة" className={ctl} style={{ width: "auto", flex: 1, minWidth: 120 }} />
              <SubmitButton pendingText="…" className={btn("success")}>سجّل النتيجة</SubmitButton>
            </form>
          )}
        </Card>
      ))}
    </div>
  );

  const Progress = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(plan?.scope_label || plan?.milestone_label) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {plan?.scope_label && <ScopeChip track={plan.track === "school" ? "school" : "cefr"}>{plan.scope_label}</ScopeChip>}
          {plan?.milestone_label && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🎯 {plan.milestone_label}</span>}
        </div>
      )}
      {/* Five-skill mastery, as honest meters (% of mastered objectives) */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <FlowerProgress size={92} skills={skillStats.map((s) => ({ label: SKILL_AR[s.skill], value: skillValue(s.skill, s.mastered, s.total), detail: s.skill === "speaking" ? speakingAssess?.label ?? "—" : `${s.mastered}/${s.total}` }))} />
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={secTitle}>إتقان المهارات الخمس</div>
            {skillStats.map((s) => {
              if (s.skill === "speaking") {
                return (
                  <div key={s.skill} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", width: 72, flexShrink: 0 }}>{SKILL_AR.speaking}</span>
                    <form action={setSkillAssessment} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <input type="hidden" name="learnerId" value={id} />
                      <input type="hidden" name="skill" value="speaking" />
                      <select name="value" defaultValue={speakingAssess?.value ?? ""} required className={sel} style={{ width: "auto", minHeight: 32, fontSize: 12, flex: 1 }}>
                        <option value="" disabled>تقييم المعلّمة…</option>
                        {SPEAKING_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <SubmitButton pendingText="…" className={btn("ghost")}>حفظ</SubmitButton>
                    </form>
                  </div>
                );
              }
              const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0;
              const lag = s.total > 0 && s.mastered / s.total < 0.5;
              return (
                <div key={s.skill} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", width: 72, flexShrink: 0 }}>{SKILL_AR[s.skill]}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: s.total === 0 ? "transparent" : lag ? "var(--apricot-400)" : "var(--brand)" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums", width: 40, textAlign: "end", flexShrink: 0 }}>{s.mastered}/{s.total}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>البتلة تمتلئ بنسبة الأهداف المُتقَنة — لا الدرجات الخام. **التحدّث** تُقيّمه المعلّمة. «الأساس اللغوي» = المفردات والقواعد.</p>
      </Card>

      {lagging.length > 0 && (
        <Card variant="soft" style={{ borderColor: "var(--apricot-300)", background: "var(--apricot-100, #ffeedc)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--apricot-600, #c97a2b)", marginBottom: 4 }}>أين أتدخّل؟</div>
          <div style={{ fontSize: 12.5, color: "var(--text-body)", lineHeight: 1.7 }}>الأضعف الآن: <strong>{lagging.join("، ")}</strong> — ركّزي الجلسة القادمة عليها.</div>
        </Card>
      )}

      {/* Objectives grouped by unit, with bud→bloom + honest tally */}
      {rows.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا نشاط بعد — أضِف أهدافاً من الخطّة، ثمّ أسنِد واجبات.</p></Card>
      ) : (
        [...rowsByUnit.entries()].map(([unit, urows]) => (
          <Card key={unit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{unit}</div>
            {urows.map((r: any, i: number) => {
              const o = objOf(r.objectives);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: i < urows.length - 1 ? "1px solid var(--ink-100)" : "none", paddingBottom: 6 }}>
                  <UnitBloom stage={unitStage({ attempts: r.attempts, correct: r.correct })} size={30} />
                  <span style={{ fontSize: 13, color: "var(--text-body)", flex: 1 }}>{o.description ?? "هدف"}</span>
                  {o.skill && <Badge tone="neutral">{SKILL_AR[o.skill as keyof typeof SKILL_AR] ?? o.skill}</Badge>}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums" }}>{r.correct}/{r.attempts}</span>
                </div>
              );
            })}
          </Card>
        ))
      )}
    </div>
  );

  const tabs: StudentTab[] = [
    { key: "overview", label: "نظرة عامة", content: Overview },
    { key: "curriculum", label: "المنهج", content: Curriculum },
    { key: "sessions", label: "الجلسات", badge: upcoming.length || undefined, content: Sessions },
    { key: "assessments", label: "الاختبارات", content: Assessments },
    { key: "progress", label: "التقدّم", content: Progress },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/studio/students" className={btn("ghost")} style={{ alignSelf: "flex-start" }}>→ كلّ الطلاب</Link>

      {/* Header with live signals */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Avatar name={name} size={48} />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{name}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {pl?.status === "completed" ? <Badge tone="success">المستوى {pl.suggested_level}</Badge> : pl?.status === "in_progress" ? <Badge tone="warning">التحديد جارٍ</Badge> : <Badge tone="neutral">بلا تحديد</Badge>}
              {plan && (plan.status === "approved" ? <Badge tone="success">خطّة معتمَدة</Badge> : <Badge tone="warning">خطّة مسودّة</Badge>)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>{overall}%</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>التقدّم العام</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--ink-100)", paddingTop: 10 }}>
          <span style={{ fontSize: 12.5, color: nextSession ? "var(--leaf-700)" : "var(--text-muted)" }}>
            {nextSession ? `القادمة: ${fmtUTC(nextSession.scheduled_at)}` : "لا مواعيد قادمة"}
          </span>
          {alerts.map((a, i) => <Badge key={i} tone={a.tone}>{a.label}</Badge>)}
        </div>
      </Card>

      <StudentTabs tabs={tabs} />
    </div>
  );
}
