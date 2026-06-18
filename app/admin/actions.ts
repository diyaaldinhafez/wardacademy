"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLeadTest } from "@/lib/generation/service";
import { assertAdmin } from "@/lib/auth";
import { expandSlots, type Rule } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

const HORIZON_WEEKS = 4;

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The intro session is delivered by a teacher; resolve the tenant's instructor. */
async function defaultInstructorId(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("id, roles").eq("tenant_id", tenantId);
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
  const instructorId = await defaultInstructorId(supabase, profile.tenant_id);

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
    .select("id, tenant_id, student_grade, student_level")
    .eq("id", leadId)
    .single();
  if (!lead) throw new Error("الطلب غير موجود.");

  const questions = await generateLeadTest({ grade: lead.student_grade, level: lead.student_level, count: 10 });
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
 * Provision real accounts from a lead: creates the guardian + the child's login,
 * links them with consent, carries over the placement level, and returns the
 * generated credentials ONCE for the admin to share (not stored).
 */
export async function provisionAccounts(
  _prev:
    | { error?: string; guardian?: { email: string; password: string }; student?: { email: string; password: string } }
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

  const instructorId = await defaultInstructorId(supabase, lead.tenant_id);
  const admin = createAdminClient();
  const gPassword = "Ward-" + Math.random().toString(36).slice(2, 8);
  const sPassword = "Ward-" + Math.random().toString(36).slice(2, 8);

  const { data: g, error: ge } = await admin.auth.admin.createUser({ email: lead.guardian_email, password: gPassword, email_confirm: true });
  if (ge) return { error: /already|exists|registered/i.test(ge.message) ? "بريد وليّ الأمر مسجَّلٌ مسبقاً." : ge.message };
  await admin.from("profiles").insert({ id: g.user.id, tenant_id: lead.tenant_id, full_name: lead.guardian_name, roles: ["guardian"], login_email: lead.guardian_email });

  const slug = (lead.student_name || "learner").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "learner";
  const sEmail = `${slug}-${Math.random().toString(36).slice(2, 7)}@learner.ward.local`;
  const { data: s, error: se } = await admin.auth.admin.createUser({ email: sEmail, password: sPassword, email_confirm: true });
  if (se) {
    await admin.auth.admin.deleteUser(g.user.id);
    return { error: se.message };
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

  await admin.from("leads").update({ status: "converted" }).eq("id", leadId);
  revalidatePath(`/admin/registrations/${leadId}`);
  return { guardian: { email: lead.guardian_email, password: gPassword }, student: { email: sEmail, password: sPassword } };
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

  const { data: tenant } = await supabase.from("tenants").select("timezone").eq("id", tenantId).maybeSingle();
  const timezone = tenant?.timezone ?? "Asia/Riyadh";

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("id, instructor_id, weekday, start_time, end_time, slot_minutes")
    .eq("active", true);
  const { data: exceptions } = await supabase.from("availability_exceptions").select("on_date").eq("kind", "block");
  const exceptionDates = new Set<string>((exceptions ?? []).map((e: any) => e.on_date));

  const desired = expandSlots({ rules: (rules ?? []) as Rule[], exceptionDates, timezone, horizonWeeks: HORIZON_WEEKS });

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
  const instructorId = await defaultInstructorId(supabase, profile.tenant_id);
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

/** Record the outcome of the free intro session on the lead. */
export async function saveIntroReport(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const outcome = String(formData.get("outcome") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("leads")
    .update({ intro_outcome: outcome, intro_notes: notes, intro_done_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/registrations");
}

/** Admin sign-out. */
export async function adminLogout() {
  const { supabase } = await assertAdmin();
  await supabase.auth.signOut();
  redirect("/studio/login");
}
