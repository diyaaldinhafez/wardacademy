/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  startPlacement, startPlan, startPlanFromIndex, createManualPlan, approvePlan, draftReportWithAI, assignItem,
  addResource, removeResource, generateAssessmentTest, approveAssessment, removeAssessment,
  generateDraft, approveItem, rejectItem, updateReport, approveReport,
  addLessonSlot, removeLessonSlot, generateLessonSessions,
  createManualHomework, gradeManualHomework, removeManualHomework,
  generateDiagnosticReport, updateDiagnostic, approveDiagnostic,
  recordObjectiveAssessment,
} from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SessionScheduleForm from "@/components/studio/SessionScheduleForm";
import StudentTabs, { type StudentTab } from "@/components/studio/StudentTabs";
import PlanBuilder from "@/components/studio/PlanBuilder";
import ItemCard from "@/components/studio/ItemCard";
import VideoCall from "@/components/VideoCall";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { SKILLS, SKILL_AR, VOCAB_AR } from "@/lib/skills";
import { UnitBloom, FlowerProgress, ScopeChip, VocabCounter } from "@/components/bloom/Bloom";
import { fetchStudentBloom } from "@/lib/progress/bloom";
import { FORMAT_LABELS, ITEM_FORMATS, DIFFICULTIES } from "@/lib/items";
import { WEEKDAY_AR } from "@/lib/availability";
import { fmtUTC } from "@/lib/datetime";

const one = (o: any) => (Array.isArray(o) ? o[0] : o);
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const ctl = "ward-field__control";
const sel = "ward-select__control";
const secTitle = { fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" } as const;

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

  // New progress model: unit/skill blooms rolled up from objective_progress (§5).
  const bloom = await fetchStudentBloom(supabase, id);
  const vocabCount = 0; // vocabulary is a separate track (not in curriculum_objectives yet)
  const petals = bloom.skills.map((s) => ({ name: s.skill, ar: SKILL_AR[s.skill], value: s.fraction }));
  const overall = bloom.skills.length ? Math.round((bloom.skills.reduce((a, s) => a + s.fraction, 0) / bloom.skills.length) * 100) : 0;
  const skillStats = bloom.skills;
  const lagging = bloom.skills.filter((s) => s.total > 0 && s.fraction < 0.5).map((s) => SKILL_AR[s.skill]);
  const startedUnits = bloom.startedUnits;

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
  // Guardian WhatsApp (leads is admin-gated by RLS; this learner is already authorised, so read the phone via service-role).
  let guardianPhone: string | null = null;
  {
    const admin = createAdminClient();
    const { data: leadRow } = await admin.from("leads").select("guardian_phone").eq("converted_learner_id", id).maybeSingle();
    guardianPhone = (leadRow?.guardian_phone ?? "").replace(/\D/g, "") || null;
  }

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
  const planUnits: string[] = [...new Set(planItems.map((it: any) => (it.unit as string) || "").filter(Boolean))];
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

  // Post-session report: teacher fills ready choices + an open note → AI writes it.
  const REPORT_FIELDS: { name: string; label: string; required?: boolean; opts: string[] }[] = [
    { name: "engagement", label: "تفاعل الطالب وحضوره", required: true, opts: ["متفاعلٌ ومتحمّس", "جيّد", "هادئ", "يحتاج تحفيزاً"] },
    { name: "comprehension", label: "فهم الدرس", required: true, opts: ["تجاوز التوقّعات", "حقّق هدف الدرس", "حقّقه جزئياً", "يحتاج إعادة"] },
    { name: "behavior", label: "المشاركة والسلوك", opts: ["متعاونٌ ومنظّم", "جيّد", "يحتاج متابعة"] },
    { name: "focusNext", label: "تركيز الجلسة القادمة", opts: ["مواصلة المنهج", "مراجعة الدرس", "مزيد تدريبٍ على المهارة"] },
  ];
  const reportWaLink = (s: any, report: any) => {
    if (!guardianPhone) return null;
    const text =
      `*تقرير جلسة ${name}*\n${fmtUTC(s.scheduled_at)}${s.lesson_title ? ` — ${s.lesson_title}` : ""}\n\n${report.summary}` +
      (report.strengths ? `\n\n✨ نقاط القوّة: ${report.strengths}` : "") +
      (report.improve ? `\n🎯 الخطوة القادمة: ${report.improve}` : "") +
      `\n\nأكاديمية وَرد`;
    return `https://wa.me/${guardianPhone}?text=${encodeURIComponent(text)}`;
  };

  const SessionCard = ({ s, showJoin = false, showReport = false }: { s: any; showJoin?: boolean; showReport?: boolean }) => {
    const report = one(s.session_reports);
    const waLink = report?.status === "approved" ? reportWaLink(s, report) : null;
    return (
      <div style={{ borderRadius: 12, border: "1px solid var(--border-soft)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(s.scheduled_at)}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {s.duration_minutes}د</span>
          {showReport && report?.status === "approved" && <Badge tone="success">تقريرٌ مُرسَل</Badge>}
        </div>
        {s.lesson_title && <div style={{ fontSize: 13, color: "var(--text-body)" }}>📖 الدرس: <strong>{s.lesson_title}</strong></div>}
        {showJoin && s.status === "scheduled" && <VideoCall sessionId={s.id} />}

        {showReport && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--ink-100)", paddingTop: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" }}>تقرير الجلسة</span>

            {!report && (
              <form action={draftReportWithAI} style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
                <input type="hidden" name="sessionId" value={s.id} />
                <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>عبّئي اختيارات الجلسة، ويكتب الذكاء تقريراً موجزاً لوليّ الأمر تراجعينه قبل الإرسال.</p>
                {REPORT_FIELDS.map((f) => (
                  <label key={f.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 130, flexShrink: 0, color: "var(--text-body)" }}>{f.label}</span>
                    <select name={f.name} required={f.required} defaultValue="" className={sel} style={{ flex: 1, minHeight: 36, fontSize: 12.5 }}>
                      <option value="" disabled>اختَر…</option>
                      {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                ))}
                <textarea name="teacherNote" rows={2} className={ctl} placeholder="ملاحظةٌ من الجلسة (سؤال مفتوح، اختياري)" />
                <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}><Spark size={13} /> ولّد التقرير بالذكاء</SubmitButton>
              </form>
            )}

            {report?.status === "draft" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
                <AITrustBadge status="draft" />
                <form action={updateReport} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <textarea name="summary" required rows={3} defaultValue={report.summary ?? ""} className={ctl} placeholder="الملخّص" />
                  <input name="strengths" defaultValue={report.strengths ?? ""} className={ctl} placeholder="نقاط القوّة" />
                  <input name="improve" defaultValue={report.improve ?? ""} className={ctl} placeholder="الخطوة القادمة" />
                  <SubmitButton pendingText="…" className={btn("secondary")}>احفظ التعديلات</SubmitButton>
                </form>
                <form action={approveReport}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <SubmitButton pendingText="…" className={btn("success")}>اعتمِد التقرير</SubmitButton>
                </form>
              </div>
            )}

            {report?.status === "approved" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-soft)", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <AITrustBadge status="approved" compact />
                  <span style={{ fontSize: 12, color: "var(--leaf-700)" }}>مُعتمَد وظاهرٌ للعائلة</span>
                  {waLink ? (
                    <a href={waLink} target="_blank" rel="noreferrer" className={btn("success")} style={{ marginInlineStart: "auto", textDecoration: "none" }}>📲 شارك عبر واتساب</a>
                  ) : (
                    <span style={{ marginInlineStart: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>لا رقم واتساب لوليّ الأمر</span>
                  )}
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-body)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{report.summary}</p>
                {report.strengths && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>✨ {report.strengths}</p>}
                {report.improve && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>🎯 {report.improve}</p>}
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
          {s.lesson_title && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>📖 {s.lesson_title}</span>}
          <Badge tone={s.status === "completed" ? "success" : s.status === "scheduled" ? "brand" : "neutral"}>{s.status}</Badge>
        </div>
        {hw.length === 0 && mhw.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا واجب لهذه الجلسة.</span>}
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
        <div style={secTitle}>المهارات الأربع + الأساس اللغوي</div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {petals.map((p) => (
            <span key={p.name} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "3px 10px" }}>{p.ar} {Math.round(p.value * 100)}%</span>
          ))}
          <VocabCounter count={vocabCount} label={`${VOCAB_AR} — كلمة`} variant="chip" />
        </div>
      </Card>
    </div>
  );

  const Plan = (
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
              {plan.status === "draft" ? <Badge tone="warning">مسودّة</Badge> : <Badge tone="success">معتمَدة</Badge>}
              {plan.scope_label && <ScopeChip>{plan.scope_label}</ScopeChip>}
              {plan.milestone_label && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🎯 {plan.milestone_label}</span>}
            </div>
            <PlanBuilder
              planId={plan.id}
              learnerId={id}
              title={plan.title}
              items={planItems}
              skills={SKILLS.map((s) => ({ value: s, label: SKILL_AR[s] }))}
            />
            <form action={approvePlan}>
              <input type="hidden" name="planId" value={plan.id} />
              <SubmitButton pendingText="…" className={btn("success")}>
                {plan.status === "draft" ? "اعتمِد الخطّة — تصبح أهدافاً قابلةً للتدريس" : "مزامنة المنهاج — أضِف الدروس الجديدة كأهداف"}
              </SubmitButton>
            </form>
            <details style={{ borderTop: "1px solid var(--ink-100)", paddingTop: 8 }}>
              <summary style={{ fontSize: 12, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>أو ولّد بالذكاء من فهرس كتاب المنهج (يستبدل الخطّة الحالية)</summary>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0", lineHeight: 1.6 }}>
                ارفع <strong>فهرس كتاب منهجٍ بمستوى CEFR</strong> (صورة/PDF/نصّ) ليستخرجه الذكاء بدقّةٍ بلا تأليف.{plan.status === "approved" && <> سيُستبدَل المنهاج الحاليّ — وتبقى الأهداف التي عليها تقدّمٌ محفوظة.</>}
              </p>
              <form action={startPlanFromIndex} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
                <input type="hidden" name="learnerId" value={id} />
                <input name="index" type="file" required accept="image/*,.pdf,.txt,.md,.csv" className={ctl} style={{ width: "auto", flex: 1, minWidth: 180 }} />
                <SubmitButton pendingText="…" className={btn("soft")}><Spark size={14} /> ولّد من الفهرس</SubmitButton>
              </form>
            </details>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
              <strong>منهاج وَرد</strong> (CEFR · A1→B1). ارفع <strong>فهرس كتاب المنهج</strong> (صورة / PDF / نصّ) — يقرؤه الذكاء ويستخرج وحداته ودروسه <strong>بدقّةٍ بلا تأليف</strong>.
            </p>
            <form action={startPlanFromIndex} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
              <input type="hidden" name="learnerId" value={id} />
              <input name="index" type="file" required accept="image/*,.pdf,.txt,.md,.csv" className={ctl} style={{ width: "auto", flex: 1, minWidth: 180 }} />
              <SubmitButton pendingText="جارٍ القراءة والتوليد…" className={btn("soft")}><Spark size={14} /> ولّد من الفهرس</SubmitButton>
            </form>
            <details>
              <summary style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>أو ولّد من مستوى CEFR (بلا فهرس)</summary>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0", lineHeight: 1.6 }}>يولّد الذكاء خطّةً متدرّجةً من مستوى التحديد ({pl?.suggested_level ?? "A1"}).</p>
              <form action={startPlan} style={{ marginTop: 4 }}>
                <input type="hidden" name="learnerId" value={id} />
                <SubmitButton pendingText="…" className={btn("ghost")}><Spark size={14} /> ولّد من المستوى</SubmitButton>
              </form>
            </details>
            <details>
              <summary style={{ fontSize: 12, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>أو أنشئ خطّةً يدويةً بالكامل</summary>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0", lineHeight: 1.6 }}>أنشئ الخطّة فارغةً ثمّ أضِف وحداتها ودروسها يدوياً بالتفصيل.</p>
              <form action={createManualPlan} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
                <input type="hidden" name="learnerId" value={id} />
                <input name="title" required placeholder="عنوان الخطّة/المنهاج" className={ctl} style={{ width: "auto", flex: 1, minWidth: 160 }} />
                <SubmitButton pendingText="…" className={btn("secondary")}>أنشئ خطّةً يدوية</SubmitButton>
              </form>
            </details>
          </div>
        )}
      </Card>
    </div>
  );

  const Curriculum = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

  const restUpcoming = upcoming.slice(1);
  const Sessions = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* HERO: the next session, front and centre — one-click join */}
      {nextSession ? (
        <Card style={{ display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(135deg, var(--brand-50, #f1ecff), var(--surface-card))", border: "1.5px solid var(--brand-200, #d8ccff)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--brand)" }}>🎥 جلستك القادمة</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmtUTC(nextSession.scheduled_at)}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {nextSession.duration_minutes}د</span>
            {nextSession.lesson_title && <Badge tone="neutral">📖 {nextSession.lesson_title}</Badge>}
          </div>
          <VideoCall sessionId={nextSession.id} />
        </Card>
      ) : (
        <Card><p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسة قادمة — جدوِلي المواعيد من «إدارة المواعيد والجدولة» أدناه.</p></Card>
      )}

      {restUpcoming.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--leaf-700)" }}>قادمةٌ أخرى ({restUpcoming.length})</p>
          {restUpcoming.map((s: any) => <SessionCard key={s.id} s={s} />)}
        </div>
      )}
      {past.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>السابقة — اكتبي تقريرها ({past.length})</p>
          {past.map((s: any) => <SessionCard key={s.id} s={s} showReport />)}
        </div>
      )}
      {(sessions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسات بعد — جدوِلي من «إدارة المواعيد والجدولة» أدناه.</p>}

      {/* Scheduling tools — used occasionally, so tucked away at the bottom */}
      <details style={{ borderRadius: 14, border: "1px solid var(--border-soft)", background: "var(--surface-card)", padding: "10px 14px" }}>
        <summary style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", cursor: "pointer" }}>إدارة المواعيد والجدولة</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
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
        </div>
      </details>
    </div>
  );

  const Homework = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Create a digital homework with AI → approve → assign to a session below */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={secTitle}>إنشاء واجبٍ رقميٍّ بالذكاء</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}><Spark size={13} /> مسودّةٌ تُراجِعها قبل الإرسال</span>
        </div>
        {(objectives ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>اعتمِد خطّةً دراسيةً أولاً (من تبويب «الخطّة») لتصبح أهدافاً تُولَّد منها الواجبات.</p>
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
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>بعد الاعتماد أسنِدها لجلسةٍ من بطاقات «واجبات الجلسات» أدناه.</p>
        </Card>
      )}

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>واجبات الجلسات</div>
        {(sessions ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسات بعد — أضِف مواعيد من تبويب «الجلسات».</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((s: any) => <HwSessionCard key={s.id} s={s} />)}
            {past.map((s: any) => <HwSessionCard key={s.id} s={s} />)}
          </div>
        )}
      </Card>

      {(looseAssigns.length > 0 || looseManual.length > 0) && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={secTitle}>واجباتٌ غير مرتبطةٍ بجلسة</div>
          {looseAssigns.map((a: any) => <HomeworkRow key={a.id} a={a} />)}
          {looseManual.map((h: any) => <ManualHwItem key={h.id} h={h} />)}
        </Card>
      )}
    </div>
  );

  const assessmentWaLink = (a: any, result: Record<string, { correct: number; total: number }>) => {
    if (!guardianPhone) return null;
    const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
    const skillLines = Object.entries(result).map(([sk, v]) => `• ${SKILL_AR[sk as keyof typeof SKILL_AR] ?? sk}: ${v.correct}/${v.total}`).join("\n");
    const text = `*نتيجة ${a.title}*\n${name}\n\nالنتيجة: ${a.score}/${a.max_score} (${pct}%)\n${skillLines}\n\nأكاديمية وَرد`;
    return `https://wa.me/${guardianPhone}?text=${encodeURIComponent(text)}`;
  };

  const Assessments = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={secTitle}>ولّد اختبار وحدة بالذكاء</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}><Spark size={13} /> من أهداف الوحدة</span>
        </div>
        {!plan ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>اعتمِدي خطّةً دراسيةً أولاً (تبويب «الخطّة»).</p>
        ) : planUnits.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا وحداتٍ في الخطّة بعد.</p>
        ) : (
          <form action={generateAssessmentTest} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
            <input type="hidden" name="learnerId" value={id} />
            <select name="unit" required defaultValue="" className={sel} style={{ width: "auto", flex: 1, minWidth: 160, minHeight: 40 }}>
              <option value="" disabled>اختاري الوحدة…</option>
              {planUnits.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select name="count" defaultValue="8" className={sel} style={{ width: "auto", minHeight: 40 }}>
              {[6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} أسئلة</option>)}
            </select>
            <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}><Spark size={14} /> ولّد الاختبار</SubmitButton>
          </form>
        )}
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>يُولِّد أسئلةً من أهداف الوحدة → تراجعينها وتعتمدينها → يؤدّيها الطالب من حسابه ويُصحَّح آلياً بنتيجةٍ لكلّ مهارة.</p>
      </Card>

      {(assessments ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا اختبارات بعد.</p>}
      {(assessments ?? []).map((a: any) => {
        const qs = aqByAssessment.get(a.id) ?? [];
        const result = (a.result ?? null) as Record<string, { correct: number; total: number }> | null;
        const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
        const waLink = a.status === "completed" && result ? assessmentWaLink(a, result) : null;
        return (
          <Card key={a.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: "var(--text-strong)", flex: 1 }}>{a.title}</span>
              {a.status === "draft" && <Badge tone="warning">مسودّة — راجعي</Badge>}
              {a.status === "ready" && <Badge tone="brand">متاحٌ للطالب</Badge>}
              {a.status === "completed" && <Badge tone="success">مكتمل: {a.score}/{a.max_score} ({pct}%)</Badge>}
              {a.status === "planned" && <Badge tone="neutral">مُخطَّط</Badge>}
              <form action={removeAssessment}><input type="hidden" name="assessmentId" value={a.id} /><input type="hidden" name="learnerId" value={id} /><SubmitButton className={btn("ghost")}>✕</SubmitButton></form>
            </div>

            {a.status === "draft" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>راجعي الأسئلة ({qs.length}) — الإجابة الصحيحة مُعلّمة بـ ✓:</p>
                {qs.map((q: any, i: number) => (
                  <div key={q.id} style={{ borderRadius: 10, background: "var(--surface-soft)", padding: 10 }}>
                    <p style={{ fontSize: 12.5, color: "var(--text-strong)", display: "flex", gap: 6, flexWrap: "wrap" }}><span style={{ fontWeight: 700 }}>{i + 1}.</span><span dir="ltr" style={{ flex: 1 }}>{q.prompt}</span><Badge tone="neutral">{SKILL_AR[q.skill as keyof typeof SKILL_AR] ?? q.skill}</Badge></p>
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
                  <SubmitButton pendingText="…" className={btn("success")}>اعتمِدي — يصبح متاحاً للطالب</SubmitButton>
                </form>
              </div>
            )}

            {a.status === "ready" && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>بانتظار أداء الطالب من حسابه؛ ستظهر النتيجة هنا تلقائياً.</p>}

            {a.status === "completed" && result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(result).map(([sk, v]) => {
                    const p = v.total ? Math.round((v.correct / v.total) * 100) : 0;
                    const lag = v.total > 0 && v.correct / v.total < 0.5;
                    return (
                      <div key={sk} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-strong)", width: 80, flexShrink: 0 }}>{SKILL_AR[sk as keyof typeof SKILL_AR] ?? sk}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, borderRadius: 999, background: lag ? "var(--apricot-400)" : "var(--brand)" }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums", width: 36, textAlign: "end", flexShrink: 0 }}>{v.correct}/{v.total}</span>
                      </div>
                    );
                  })}
                </div>
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noreferrer" className={btn("success")} style={{ alignSelf: "flex-start", textDecoration: "none" }}>📲 شارك النتيجة عبر واتساب</a>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>لا رقم واتساب لوليّ الأمر للمشاركة.</span>
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
          {plan?.milestone_label && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🎯 {plan.milestone_label}</span>}
        </div>
      )}
      {/* Four-skill mastery (honest meters) + the separate vocabulary counter */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <FlowerProgress size={92} skills={skillStats.map((s) => ({ label: SKILL_AR[s.skill], value: s.fraction, detail: `${s.value.toFixed(1)}/10` }))} />
            <VocabCounter count={vocabCount} label={`${VOCAB_AR} — كلمة`} variant="chip" />
          </div>
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={secTitle}>المهارات الأربع — متوسّط عبر الوحدات المبدوءة</div>
            {skillStats.map((s) => {
              const pct = Math.round(s.fraction * 100);
              const lag = s.total > 0 && s.fraction < 0.5;
              return (
                <div key={s.skill} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", width: 72, flexShrink: 0 }}>{SKILL_AR[s.skill]}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: s.total === 0 ? "transparent" : lag ? "var(--apricot-400)" : "var(--brand)" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums", width: 48, textAlign: "end", flexShrink: 0 }}>{s.value.toFixed(1)}/10</span>
                </div>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>البتلة = متوسّط درجات أهداف المهارة عبر الوحدات المبدوءة (الهدف غير المُقيَّم = بذرة). التحدّث يحسمه المعلّم. «الأساس اللغوي» مسارٌ منفصل.</p>
      </Card>

      {lagging.length > 0 && (
        <Card variant="soft" style={{ borderColor: "var(--apricot-300)", background: "var(--apricot-100, #ffeedc)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--apricot-600, #c97a2b)", marginBottom: 4 }}>أين أتدخّل؟</div>
          <div style={{ fontSize: 12.5, color: "var(--text-body)", lineHeight: 1.7 }}>الأضعف الآن: <strong>{lagging.join("، ")}</strong> — ركّزي الجلسة القادمة عليها.</div>
        </Card>
      )}

      {/* Unit blooms + per-objective teacher assessment (feeds the decaying average) */}
      {startedUnits.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا تقييماتٍ بعد — قيّم أوّل هدفٍ من وحدةٍ ليبدأ تفتّحها.</p></Card>
      ) : (
        startedUnits.map((u) => (
          <Card key={u.unit_id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UnitBloom value={u.value} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{u.title_ar}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{u.level} · وردة الوحدة {u.value.toFixed(1)}/10 · قُيّم {u.assessedCount}/{u.total}</div>
              </div>
            </div>
            {u.objectives.map((o, i) => (
              <div key={o.objective_id} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: i === 0 ? "none" : "1px solid var(--ink-100)", paddingTop: i === 0 ? 0 : 6 }}>
                <UnitBloom stage={o.state} size={26} />
                <span style={{ fontSize: 12.5, color: o.assessed ? "var(--text-body)" : "var(--text-muted)", flex: 1 }}>{o.descriptor_ar}</span>
                <Badge tone="neutral">{SKILL_AR[o.skill]}</Badge>
                <form action={recordObjectiveAssessment} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="hidden" name="learnerId" value={id} />
                  <input type="hidden" name="objectiveId" value={o.objective_id} />
                  <select name="state" defaultValue={o.assessed ? o.state : ""} required className={sel} style={{ width: "auto", minHeight: 30, fontSize: 12 }}>
                    <option value="" disabled>قيّم…</option>
                    <option value="seed">بذرة</option>
                    <option value="bud">برعم</option>
                    <option value="balloon">بالون</option>
                    <option value="bloom">وردة</option>
                  </select>
                  <SubmitButton pendingText="…" className={btn("ghost")}>حفظ</SubmitButton>
                </form>
              </div>
            ))}
          </Card>
        ))
      )}
    </div>
  );

  const tabs: StudentTab[] = [
    { key: "overview", label: "عام", content: Overview },
    { key: "curriculum", label: "المنهج", content: Curriculum },
    { key: "plan", label: "الخطّة", content: Plan },
    { key: "sessions", label: "الجلسات", badge: upcoming.length || undefined, content: Sessions },
    { key: "homework", label: "الواجبات", content: Homework },
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
