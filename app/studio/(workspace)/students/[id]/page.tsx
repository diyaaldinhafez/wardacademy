/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  startPlacement, startPlan, approvePlan, draftReportWithAI, assignItem,
  addResource, removeResource, createAssessment, recordAssessment, removeAssessment,
  generateDraft, approveItem, rejectItem, updateReport, approveReport,
  setLessonSchedule, generateLessonSessions,
  createManualHomework, gradeManualHomework, removeManualHomework,
  generateDiagnosticReport, updateDiagnostic, approveDiagnostic,
} from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SessionScheduleForm from "@/components/studio/SessionScheduleForm";
import StudentTabs, { type StudentTab } from "@/components/studio/StudentTabs";
import ItemCard from "@/components/studio/ItemCard";
import VideoCall from "@/components/VideoCall";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { bloomStage } from "@/lib/progress";
import { petalValues, SKILL_AR } from "@/lib/skills";
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
const AR_STAGE: Record<string, string> = {
  "Not started": "لم يبدأ", Practiced: "تدرّب", Sprouting: "بذرة", Budding: "برعم", Growing: "ينمو", Blooming: "متفتّح",
};

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
  const { data: plan } = await supabase.from("study_plans").select("id, title, level, items, status").eq("learner_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const planItems: any[] = (plan?.items as any[]) ?? [];
  // Group plan lessons into their units, keeping each lesson's global index.
  const planGroups: { unit: string; lessons: { it: any; i: number }[] }[] = [];
  planItems.forEach((it, i) => {
    const unit = (it.unit as string) || "دروس";
    let g = planGroups[planGroups.length - 1];
    if (!g || g.unit !== unit) { g = { unit, lessons: [] }; planGroups.push(g); }
    g.lessons.push({ it, i });
  });

  const { data: prog } = await supabase.from("progress_records").select("attempts, correct, completions, objectives(description, level, skill)").eq("learner_id", id);
  const rows = (prog ?? []) as any[];
  const petals = petalValues(rows.map((r) => ({ attempts: r.attempts, correct: r.correct, skill: objOf(r.objectives).skill })));
  const overall = petals.length ? Math.round(petals.reduce((a, p) => a + p.value, 0) / petals.length) : 0;

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
  const { data: lessonSchedule } = await supabase.from("lesson_schedules").select("weekday, time_of_day, duration_minutes").eq("learner_id", id).maybeSingle();
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
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>
              {plan.title} {plan.status === "draft" ? <Badge tone="warning">مسودّة</Badge> : <Badge tone="success">معتمَدة</Badge>}
            </p>
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
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {plan.status === "draft" && (
              <form action={approvePlan}>
                <input type="hidden" name="planId" value={plan.id} />
                <SubmitButton pendingText="…" className={btn("success")}>اعتمِد الخطّة — تصبح أهدافاً قابلةً للتدريس</SubmitButton>
              </form>
            )}
          </>
        ) : (
          <form action={startPlan}><input type="hidden" name="learnerId" value={id} /><SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}><Spark size={14} /> ولّد خطّةً بالذكاء</SubmitButton></form>
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
      {/* Fixed weekly slot → generate the plan's sessions ahead */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>الموعد الأسبوعيّ الثابت</div>
        <form action={setLessonSchedule} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "end" }}>
          <input type="hidden" name="learnerId" value={id} />
          <select name="weekday" defaultValue={lessonSchedule?.weekday ?? 0} className={sel} style={{ width: "auto", minHeight: 40 }}>
            {WEEKDAY_AR.map((w, i) => <option key={i} value={i}>{w}</option>)}
          </select>
          <input name="time" type="time" required defaultValue={lessonSchedule ? String(lessonSchedule.time_of_day).slice(0, 5) : "16:00"} className={ctl} style={{ width: "auto" }} />
          <select name="duration" defaultValue={String(lessonSchedule?.duration_minutes ?? 30)} className={sel} style={{ width: "auto", minHeight: 40 }}>
            <option value="30">30 دقيقة</option>
            <option value="45">45 دقيقة</option>
            <option value="60">60 دقيقة</option>
          </select>
          <SubmitButton pendingText="…" className={btn("secondary")}>احفظ الموعد</SubmitButton>
        </form>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <form action={generateLessonSessions}>
            <input type="hidden" name="learnerId" value={id} />
            <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}>ولّد جلسات الخطّة</SubmitButton>
          </form>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>يجدول دروس الخطّة أسبوعياً ابتداءً من الموعد، ويربط كلّ جلسةٍ بدرسها.</span>
        </div>
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
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={secTitle}>المهارات والإتقان</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {petals.map((p) => (
          <span key={p.name} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "3px 10px" }}>{p.ar} {Math.round(p.value)}%</span>
        ))}
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا نشاط بعد — أضِف أهدافاً من الخطّة، ثمّ أسنِد واجبات.</p>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => {
            const o = objOf(r.objectives);
            const stage = bloomStage(r);
            return (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text-body)" }}>{o.level ? `${o.level} · ` : ""}{o.description ?? "هدف"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Badge tone="success">{AR_STAGE[stage.label] ?? stage.label}</Badge>
                  <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{r.correct}/{r.attempts}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  const tabs: StudentTab[] = [
    { key: "overview", label: "نظرة عامة", content: Overview },
    { key: "curriculum", label: "المنهج", content: Curriculum },
    { key: "sessions", label: "الجلسات", badge: upcoming.length || undefined, content: Sessions },
    { key: "assessments", label: "الاختبارات", content: Assessments },
    { key: "progress", label: "التقدّم", content: Progress },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
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
