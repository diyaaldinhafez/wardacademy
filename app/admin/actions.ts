"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLeadTest, generateIntroReport } from "@/lib/generation/service";
import { assertAdmin } from "@/lib/auth";
import { expandSlots, type Rule } from "@/lib/availability";
import { sendBookingConfirmation, sendAccountInvite, sendIntroReport } from "@/lib/email";
import { introLabel, introLabels } from "@/lib/introReport";

const HORIZON_WEEKS = 4;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ward.academy";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The intro session is delivered by a teacher; resolve the tenant's instructor.
 * Uses the service role (a trusted lookup) because the admin's RLS does not
 * grant read access to other users' profiles.
 */
async function defaultInstructorId(tenantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, roles, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: true });
  const teacher = (data ?? []).find((p: any) => ((p.roles as string[]) ?? []).includes("instructor"));
  if (!teacher) throw new Error("لا يوجد معلّمٌ في المنصّة بعد.");
  return teacher.id;
}

/** Admin opens an intro-session time slot for booking. */
export async function addSlot(formData: FormData) {
  const startsAt = String(formData.get("startsAt") ?? "");
  const duration = Number(formData.get("duration") ?? 30);
  if (!startsAt) throw new Error("اختر وقتاً.");

  const { supabase, profile } = await assertAdmin();
  const instructorId = await defaultInstructorId(profile.tenant_id);

  const { error } = await supabase.from("availability_slots").insert({
    tenant_id: profile.tenant_id,
    instructor_id: instructorId,
    starts_at: startsAt,
    duration_minutes: duration,
    status: "open",
  });
  if (error) throw new Error(error.code === "23505" ? "هذا الوقت مُضافٌ مسبقاً." : error.message);
  revalidatePath("/admin/availability");
}

export async function removeSlot(formData: FormData) {
  const id = String(formData.get("slotId") ?? "");
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("availability_slots").delete().eq("id", id).eq("status", "open");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/availability");
}

/** Generate a tailored placement test for a lead (draft → admin reviews → approves). */
export async function generateLeadTestAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, user } = await assertAdmin();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, tenant_id, student_age, student_level")
    .eq("id", leadId)
    .single();
  if (!lead) throw new Error("الطلب غير موجود.");

  const questions = await generateLeadTest({
    grade: lead.student_age ? `عمر ${lead.student_age} سنة` : null,
    level: lead.student_level,
    count: 10,
  });
  if (!questions.length) throw new Error("تعذّر توليد الاختبار.");

  const { data: test, error } = await supabase
    .from("lead_tests")
    .insert({ tenant_id: lead.tenant_id, lead_id: lead.id, status: "draft", created_by: user.id })
    .select("id")
    .single();
  if (error || !test) throw new Error(error?.message ?? "تعذّر الإنشاء.");

  const rows = questions.map((q, i) => ({
    lead_test_id: test.id,
    tenant_id: lead.tenant_id,
    level: q.level,
    format: "multiple_choice",
    prompt: q.prompt,
    content: { options: q.options },
    answer: q.answer,
    position: i,
  }));
  const { error: qErr } = await supabase.from("lead_test_questions").insert(rows);
  if (qErr) throw new Error(qErr.message);

  await supabase.from("leads").update({ status: "testing" }).eq("id", leadId);
  revalidatePath(`/admin/registrations/${leadId}`);
  revalidatePath("/admin/tests");
}

/** Approve a draft lead test and make it shareable (generates a signed token). */
export async function approveLeadTestAction(formData: FormData) {
  const testId = String(formData.get("testId") ?? "");
  const { supabase } = await assertAdmin();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("lead_tests")
    .update({ status: "shared", share_token: token, shared_at: new Date().toISOString() })
    .eq("id", testId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tests");
}

/**
 * Provision real accounts from a lead: creates the guardian + the child's login
 * (no password), links them with consent, carries over the placement level,
 * assigns the teacher, and returns set-password invite links to share.
 */
export async function provisionAccounts(
  _prev:
    | { error?: string; guardian?: { email: string; link: string }; student?: { email: string; link: string } }
    | undefined,
  formData: FormData,
) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase } = await assertAdmin();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, tenant_id, guardian_name, guardian_email, student_name, status")
    .eq("id", leadId)
    .single();
  if (!lead) return { error: "الطلب غير موجود." };
  if (lead.status === "converted") return { error: "جُهّزت الحسابات مسبقاً." };

  const instructorId = await defaultInstructorId(lead.tenant_id);
  const admin = createAdminClient();

  // Create accounts WITHOUT a password; the family sets their own via an invite
  // (set-password) link — no plaintext password is ever shown or sent.
  const { data: g, error: ge } = await admin.auth.admin.createUser({ email: lead.guardian_email, email_confirm: true });
  if (ge || !g.user) return { error: ge && /already|exists|registered/i.test(ge.message) ? "بريد وليّ الأمر مسجَّلٌ مسبقاً." : ge?.message ?? "تعذّر الإنشاء." };
  await admin.from("profiles").insert({ id: g.user.id, tenant_id: lead.tenant_id, full_name: lead.guardian_name, roles: ["guardian"], login_email: lead.guardian_email });

  const slug = (lead.student_name || "learner").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "learner";
  const sEmail = `${slug}-${Math.random().toString(36).slice(2, 7)}@learner.ward.local`;
  const { data: s, error: se } = await admin.auth.admin.createUser({ email: sEmail, email_confirm: true });
  if (se || !s.user) {
    await admin.auth.admin.deleteUser(g.user.id);
    return { error: se?.message ?? "تعذّر إنشاء حساب الطالب." };
  }
  await admin.from("profiles").insert({ id: s.user.id, tenant_id: lead.tenant_id, full_name: lead.student_name, roles: ["learner"], is_minor: true, login_email: sEmail, assigned_instructor_id: instructorId });
  await admin.from("guardianships").insert({ tenant_id: lead.tenant_id, guardian_id: g.user.id, learner_id: s.user.id, relationship: "parent", consent_granted: true, consent_at: new Date().toISOString() });

  // carry over placement level
  const { data: lt } = await admin
    .from("lead_tests")
    .select("suggested_level")
    .eq("lead_id", leadId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lt?.suggested_level) {
    await admin.from("placement_tests").insert({ tenant_id: lead.tenant_id, learner_id: s.user.id, status: "completed", suggested_level: lt.suggested_level, completed_at: new Date().toISOString() });
  }

  // Set-password (invite) links — emailed to the guardian; both returned for WhatsApp.
  async function inviteLink(email: string): Promise<string> {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${SITE_URL}/set-password` } });
    if (error) throw new Error(error.message);
    return data.properties?.action_link ?? "";
  }
  const guardianLink = await inviteLink(lead.guardian_email);
  const studentLink = await inviteLink(sEmail);

  try {
    await sendAccountInvite({ to: lead.guardian_email, name: lead.guardian_name, role: "guardian", link: guardianLink });
  } catch (e) {
    console.error("[provisionAccounts] invite email failed:", e);
  }

  await admin.from("leads").update({ status: "converted" }).eq("id", leadId);
  revalidatePath(`/admin/registrations/${leadId}`);
  return { guardian: { email: lead.guardian_email, link: guardianLink }, student: { email: sEmail, link: studentLink } };
}

/**
 * Expand the active weekly rules (minus exception dates) into concrete bookable
 * slots over a rolling horizon. UPSERT (never duplicates), then prune only the
 * rule-generated OPEN future slots that no longer match — booked and manually
 * added slots are never touched.
 */
export async function regenerateSlots() {
  const { supabase, profile } = await assertAdmin();
  const tenantId = profile.tenant_id;

  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").eq("id", tenantId).maybeSingle();
  const timezone = tenant?.timezone ?? "Asia/Riyadh";
  const breakMinutes = tenant?.slot_break_minutes ?? 15;

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("id, instructor_id, weekday, start_time, end_time, slot_minutes")
    .eq("active", true);
  const { data: exceptions } = await supabase.from("availability_exceptions").select("on_date").eq("kind", "block");
  const exceptionDates = new Set<string>((exceptions ?? []).map((e: any) => e.on_date));

  const desired = expandSlots({ rules: (rules ?? []) as Rule[], exceptionDates, timezone, horizonWeeks: HORIZON_WEEKS, breakMinutes });

  if (desired.length) {
    const rows = desired.map((d) => ({
      tenant_id: tenantId,
      instructor_id: d.instructor_id,
      starts_at: d.starts_at,
      duration_minutes: d.duration_minutes,
      status: "open",
      source_rule_id: d.source_rule_id,
    }));
    const { error } = await supabase.from("availability_slots").upsert(rows, { onConflict: "instructor_id,starts_at", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  // Prune stale generated-open future slots (compare by epoch, not string).
  const desiredEpochs = new Set(desired.map((d) => Date.parse(d.starts_at)));
  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("availability_slots")
    .select("id, starts_at")
    .eq("status", "open")
    .not("source_rule_id", "is", null)
    .gte("starts_at", nowIso);
  const stale = (existing ?? []).filter((s: any) => !desiredEpochs.has(Date.parse(s.starts_at))).map((s: any) => s.id);
  if (stale.length) {
    const { error } = await supabase.from("availability_slots").delete().in("id", stale);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/availability");
}

/** Add a recurring weekly availability rule, then regenerate slots. */
export async function createRule(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);
  if (Number.isNaN(weekday) || !startTime || !endTime) throw new Error("أكمِل بيانات القاعدة.");
  if (endTime <= startTime) throw new Error("وقت النهاية يجب أن يكون بعد البداية.");

  const { supabase, profile } = await assertAdmin();
  const instructorId = await defaultInstructorId(profile.tenant_id);
  const { error } = await supabase.from("availability_rules").insert({
    tenant_id: profile.tenant_id,
    instructor_id: instructorId,
    weekday,
    start_time: startTime,
    end_time: endTime,
    slot_minutes: slotMinutes,
  });
  if (error) throw new Error(error.message);
  await regenerateSlots();
}

export async function deleteRule(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const { supabase } = await assertAdmin();
  // Drop this rule's future open slots first (FK would otherwise orphan them).
  await supabase.from("availability_slots").delete().eq("source_rule_id", id).eq("status", "open").gte("starts_at", new Date().toISOString());
  const { error } = await supabase.from("availability_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await regenerateSlots();
}

/** Set the break between sessions (minutes), then regenerate slots. */
export async function setBreakMinutes(formData: FormData) {
  const minutes = Math.max(0, Math.min(120, Number(formData.get("breakMinutes") ?? 15)));
  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase.from("tenants").update({ slot_break_minutes: minutes }).eq("id", profile.tenant_id);
  if (error) throw new Error(error.message);
  await regenerateSlots();
}

export async function addException(formData: FormData) {
  const onDate = String(formData.get("onDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!onDate) throw new Error("اختر تاريخاً.");
  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase
    .from("availability_exceptions")
    .upsert({ tenant_id: profile.tenant_id, on_date: onDate, reason, kind: "block" }, { onConflict: "tenant_id,on_date" });
  if (error) throw new Error(error.message);
  await regenerateSlots();
}

export async function removeException(formData: FormData) {
  const id = String(formData.get("exceptionId") ?? "");
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("availability_exceptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await regenerateSlots();
}

/** Resend the booking-confirmation email for a lead's booked intro session. */
export async function resendConfirmation(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, profile } = await assertAdmin();

  const { data: lead } = await supabase
    .from("leads")
    .select("guardian_name, guardian_email, student_name")
    .eq("id", leadId)
    .single();
  const { data: slot } = await supabase
    .from("availability_slots")
    .select("starts_at")
    .eq("lead_id", leadId)
    .eq("status", "booked")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lead || !slot) throw new Error("لا يوجد موعدٌ محجوزٌ لهذا الطلب.");

  const { data: tenant } = await supabase.from("tenants").select("timezone").eq("id", profile.tenant_id).maybeSingle();
  const res = await sendBookingConfirmation({
    to: lead.guardian_email,
    guardianName: lead.guardian_name,
    studentName: lead.student_name,
    whenUTC: slot.starts_at,
    timezone: tenant?.timezone ?? "Asia/Riyadh",
  });
  if (!res.ok && !res.skipped) throw new Error(res.error ?? "تعذّر الإرسال.");
  revalidatePath(`/admin/registrations`);
}

/** Generate (or regenerate) the AI intro-session report draft from the form inputs. */
export async function generateIntroReportAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const engagement = String(formData.get("engagement") ?? "").trim() || null;
  const strengths = formData.getAll("strengths").map(String);
  const focus = formData.getAll("focus").map(String);
  const level = String(formData.get("level") ?? "").trim() || null;
  const decision = String(formData.get("decision") ?? "considering").trim();
  const teacherNote = String(formData.get("teacherNote") ?? "").trim() || null;

  const { supabase, user, profile } = await assertAdmin();
  const { data: lead } = await supabase.from("leads").select("id, student_name").eq("id", leadId).single();
  if (!lead) throw new Error("الطلب غير موجود.");

  const report = await generateIntroReport({
    studentName: lead.student_name,
    engagement: introLabel("engagement", engagement) || undefined,
    strengths: introLabels("strengths", strengths),
    focus: introLabels("focus", focus),
    level: level || undefined,
    decision: (["enroll", "considering", "declined"].includes(decision) ? decision : "considering") as "enroll" | "considering" | "declined",
    teacherNote: teacherNote || undefined,
  });

  const { error } = await supabase.from("intro_reports").upsert(
    {
      tenant_id: profile.tenant_id,
      lead_id: leadId,
      engagement,
      strengths,
      focus,
      level,
      decision,
      teacher_note: teacherNote,
      ai_report: report,
      status: "draft",
      created_by: user.id,
    },
    { onConflict: "lead_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Save edits to the generated report text. */
export async function updateIntroReport(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const aiReport = String(formData.get("aiReport") ?? "").trim();
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("intro_reports").update({ ai_report: aiReport }).eq("lead_id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Approve and send the intro report to the guardian. */
export async function sendIntroReportAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase } = await assertAdmin();

  const { data: report } = await supabase.from("intro_reports").select("ai_report, status").eq("lead_id", leadId).maybeSingle();
  if (!report?.ai_report) throw new Error("ولّد التقرير أولاً.");
  const { data: lead } = await supabase.from("leads").select("guardian_name, guardian_email, student_name").eq("id", leadId).single();
  if (!lead) throw new Error("الطلب غير موجود.");

  const res = await sendIntroReport({
    to: lead.guardian_email,
    guardianName: lead.guardian_name,
    studentName: lead.student_name,
    body: report.ai_report,
  });
  if (!res.ok && !res.skipped) throw new Error(res.error ?? "تعذّر الإرسال.");

  await supabase.from("intro_reports").update({ status: "sent", sent_at: new Date().toISOString() }).eq("lead_id", leadId);
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Manually update the lead's payment status (until a real gateway exists). */
export async function setPaymentStatus(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["pending", "link_sent", "paid"].includes(status)) throw new Error("حالة دفعٍ غير صحيحة.");
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("leads")
    .update({ payment_status: status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Admin sign-out. */
export async function adminLogout() {
  const { supabase } = await assertAdmin();
  await supabase.auth.signOut();
  redirect("/studio/login");
}
