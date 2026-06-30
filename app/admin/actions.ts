"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLeadTest, generateIntroReport } from "@/lib/generation/service";
import { assertAdmin } from "@/lib/auth";
import { expandSlots, type Rule } from "@/lib/availability";
import { sendBookingConfirmation, sendAccountInvite, sendIntroReport } from "@/lib/email";
import { introLabel, introLabels } from "@/lib/introReport";

const HORIZON_WEEKS = 4;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ward.academy";

// Admin is English by internal decision — system messages are English.
const adminErr = async (key: string) => (await getTranslations({ locale: "en", namespace: "admin.errors" }))(key);

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Append an entry to a lead's activity log (who did what, when). */
async function logEvent(supabase: any, profile: any, leadId: string, kind: string) {
  await supabase.from("lead_events").insert({
    tenant_id: profile.tenant_id,
    lead_id: leadId,
    actor_id: profile.id,
    actor_name: profile.full_name ?? null,
    kind,
  });
}

/**
 * The intro session is delivered by a teacher; resolve the tenant's instructor.
 * Uses the service role (a trusted lookup) because the admin's RLS does not
 * grant read access to other users' profiles.
 */
async function defaultInstructorId(tenantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, roles, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: true });
  const teacher = (data ?? []).find((p: any) => ((p.roles as string[]) ?? []).includes("instructor"));
  if (!teacher) throw new Error(await adminErr("noTeacher"));
  return teacher.id;
}

/** Admin opens an intro-session time slot for booking. */
export async function addSlot(formData: FormData) {
  const startsAt = String(formData.get("startsAt") ?? "");
  const duration = Number(formData.get("duration") ?? 30);
  if (!startsAt) throw new Error(await adminErr("pickTime"));

  const { supabase, profile } = await assertAdmin();
  const instructorId = await defaultInstructorId(profile.tenant_id);

  const { error } = await supabase.from("availability_slots").insert({
    tenant_id: profile.tenant_id,
    instructor_id: instructorId,
    starts_at: startsAt,
    duration_minutes: duration,
    status: "open",
  });
  if (error) throw new Error(error.code === "23505" ? await adminErr("slotExists") : error.message);
  revalidatePath("/admin/teachers", "layout");
}

export async function removeSlot(formData: FormData) {
  const id = String(formData.get("slotId") ?? "");
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("availability_slots").delete().eq("id", id).eq("status", "open");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/teachers", "layout");
}

/** Generate a tailored placement test for a lead (draft → admin reviews → approves). */
export async function generateLeadTestAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, user, profile } = await assertAdmin();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, tenant_id, student_age, student_level")
    .eq("id", leadId)
    .single();
  if (!lead) throw new Error(await adminErr("leadNotFound"));

  const questions = await generateLeadTest({
    grade: lead.student_age ? `Age ${lead.student_age}` : null,
    level: lead.student_level,
    count: 10,
  });
  if (!questions.length) throw new Error(await adminErr("testGenFailed"));

  const { data: test, error } = await supabase
    .from("lead_tests")
    .insert({ tenant_id: lead.tenant_id, lead_id: lead.id, status: "draft", created_by: user.id })
    .select("id")
    .single();
  if (error || !test) throw new Error(error?.message ?? (await adminErr("createFailed")));

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
  await logEvent(supabase, profile, leadId, "Generated placement test");
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
 * Confirm or override the placement entry level (the human decision), kept
 * separate from suggested_level (the machine result — never overwritten). Runs
 * at the completed-test step in the registration funnel; provisionAccounts then
 * carries confirmed_level over to placement_tests for the student side.
 */
export async function confirmPlacementLevel(formData: FormData) {
  const testId = String(formData.get("testId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const level = String(formData.get("level") ?? "");
  const { supabase } = await assertAdmin();
  if (!["A1", "A2", "B1"].includes(level)) throw new Error(await adminErr("invalidLevel"));
  const { error } = await supabase.from("lead_tests").update({ confirmed_level: level }).eq("id", testId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/registrations/${leadId}`);
}

/**
 * Provision real accounts from a lead: creates the guardian + the child's login
 * (no password), links them with consent, carries over the placement level,
 * assigns the teacher, and returns set-password invite links to share.
 */
export async function provisionAccounts(
  _prev:
    | { error?: string; guardian?: { email: string; link: string }; student?: { email: string; link: string }; inviteMessage?: string }
    | undefined,
  formData: FormData,
) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, profile } = await assertAdmin();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, tenant_id, guardian_name, guardian_email, student_name, status, guardian_locale")
    .eq("id", leadId)
    .single();
  if (!lead) return { error: await adminErr("leadNotFound") };
  if (lead.status === "converted") return { error: await adminErr("accountsAlready") };

  const instructorId = await defaultInstructorId(lead.tenant_id);
  const admin = createAdminClient();

  // Create accounts WITHOUT a password; the family sets their own via an invite
  // (set-password) link — no plaintext password is ever shown or sent.
  const { data: g, error: ge } = await admin.auth.admin.createUser({ email: lead.guardian_email, email_confirm: true });
  if (ge || !g.user) return { error: ge && /already|exists|registered/i.test(ge.message) ? await adminErr("guardianEmailExists") : ge?.message ?? (await adminErr("createFailed")) };
  await admin.from("profiles").insert({ id: g.user.id, tenant_id: lead.tenant_id, full_name: lead.guardian_name, roles: ["guardian"], login_email: lead.guardian_email, comms_locale: lead.guardian_locale ?? null });

  const slug = (lead.student_name || "learner").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "learner";
  const sEmail = `${slug}-${Math.random().toString(36).slice(2, 7)}@learner.ward.local`;
  const { data: s, error: se } = await admin.auth.admin.createUser({ email: sEmail, email_confirm: true });
  if (se || !s.user) {
    await admin.auth.admin.deleteUser(g.user.id);
    return { error: se?.message ?? (await adminErr("studentAccountFailed")) };
  }
  await admin.from("profiles").insert({ id: s.user.id, tenant_id: lead.tenant_id, full_name: lead.student_name, roles: ["learner"], is_minor: true, login_email: sEmail, assigned_instructor_id: instructorId });
  await admin.from("guardianships").insert({ tenant_id: lead.tenant_id, guardian_id: g.user.id, learner_id: s.user.id, relationship: "parent", consent_granted: true, consent_at: new Date().toISOString() });

  // carry over placement level
  const { data: lt } = await admin
    .from("lead_tests")
    .select("suggested_level, confirmed_level")
    .eq("lead_id", leadId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lt?.suggested_level) {
    await admin.from("placement_tests").insert({ tenant_id: lead.tenant_id, learner_id: s.user.id, status: "completed", suggested_level: lt.suggested_level, confirmed_level: lt.confirmed_level ?? null, completed_at: new Date().toISOString() });
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
    await sendAccountInvite({ to: lead.guardian_email, name: lead.guardian_name, role: "guardian", link: guardianLink, locale: lead.guardian_locale });
  } catch (e) {
    console.error("[provisionAccounts] invite email failed:", e);
  }

  await admin.from("leads").update({ status: "converted", converted_learner_id: s.user.id }).eq("id", leadId);
  await logEvent(supabase, profile, leadId, "Accounts provisioned");
  revalidatePath(`/admin/registrations/${leadId}`);

  // The WhatsApp invite text is built here in the GUARDIAN's language (not the
  // admin's forced-en UI), so ProvisionPanel renders it without a client locale.
  const inviteLocale = "ar"; // PA-1: parent comms are Arabic-only (guardian_locale no longer selects EN)
  const twa = await getTranslations({ locale: inviteLocale, namespace: "comms.whatsapp.invite" });
  const inviteMessage =
    `${twa("intro")}\n\n${twa("guardianLabel")} (${lead.guardian_email}):\n${guardianLink}\n\n${twa("studentLabel")}:\n${studentLink}`;

  return {
    guardian: { email: lead.guardian_email, link: guardianLink },
    student: { email: sEmail, link: studentLink },
    inviteMessage,
  };
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

  revalidatePath("/admin/teachers", "layout");
}

/** Add a recurring weekly availability rule, then regenerate slots. */
export async function createRule(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);
  if (Number.isNaN(weekday) || !startTime || !endTime) throw new Error(await adminErr("completeRuleData"));
  if (endTime <= startTime) throw new Error(await adminErr("endAfterStart"));

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
  if (!onDate) throw new Error(await adminErr("pickDate"));
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
  if (!lead || !slot) throw new Error(await adminErr("noBookedSlot"));

  const { data: tenant } = await supabase.from("tenants").select("timezone").eq("id", profile.tenant_id).maybeSingle();
  const res = await sendBookingConfirmation({
    to: lead.guardian_email,
    guardianName: lead.guardian_name,
    studentName: lead.student_name,
    whenUTC: slot.starts_at,
    timezone: tenant?.timezone ?? "Asia/Riyadh",
  });
  if (!res.ok && !res.skipped) throw new Error(res.error ?? (await adminErr("sendFailed")));
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
  if (!lead) throw new Error(await adminErr("leadNotFound"));

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
  const { supabase, profile } = await assertAdmin();

  const { data: report } = await supabase.from("intro_reports").select("ai_report, status").eq("lead_id", leadId).maybeSingle();
  if (!report?.ai_report) throw new Error(await adminErr("generateReportFirst"));
  const { data: lead } = await supabase.from("leads").select("guardian_name, guardian_email, student_name, guardian_locale").eq("id", leadId).single();
  if (!lead) throw new Error(await adminErr("leadNotFound"));

  const res = await sendIntroReport({
    to: lead.guardian_email,
    guardianName: lead.guardian_name,
    studentName: lead.student_name,
    body: report.ai_report,
    locale: lead.guardian_locale,
  });
  if (!res.ok && !res.skipped) throw new Error(res.error ?? (await adminErr("sendFailed")));

  await supabase.from("intro_reports").update({ status: "sent", sent_at: new Date().toISOString() }).eq("lead_id", leadId);
  await logEvent(supabase, profile, leadId, "Session report sent");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Manually update the lead's payment status (until a real gateway exists). */
export async function setPaymentStatus(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["pending", "link_sent", "paid"].includes(status)) throw new Error(await adminErr("invalidPaymentStatus"));
  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase
    .from("leads")
    .update({ payment_status: status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  await logEvent(supabase, profile, leadId, status === "paid" ? "Payment received" : status === "link_sent" ? "Payment link sent" : "Payment reset to pending");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Edit a lead's contact details (e.g. the guardian changed their WhatsApp/email). */
export async function updateLeadContact(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const guardian_name = get("guardianName");
  const guardian_email = get("guardianEmail").toLowerCase();
  const student_name = get("studentName");
  const guardian_phone = get("guardianPhone");
  if (!guardian_name || !guardian_email || !student_name) throw new Error(await adminErr("contactRequired"));

  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase
    .from("leads")
    .update({ guardian_name, guardian_email, student_name, guardian_phone: guardian_phone || null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  await logEvent(supabase, profile, leadId, "Contact details updated");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Correct the guardian's preferred communication language — writes leads, and the
 *  live guardian account (profiles.comms_locale) when already provisioned. */
export async function updateGuardianLocale(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const locale = String(formData.get("locale") ?? "");
  if (locale !== "en" && locale !== "ar") throw new Error(await adminErr("invalidLocale"));
  const { supabase, profile } = await assertAdmin();

  const { data: lead } = await supabase.from("leads").select("status, guardian_email").eq("id", leadId).single();
  if (!lead) throw new Error(await adminErr("leadNotFound"));

  const { error } = await supabase.from("leads").update({ guardian_locale: locale }).eq("id", leadId);
  if (error) throw new Error(error.message);

  // Already provisioned → push it onto the live guardian account too.
  if (lead.status === "converted" && lead.guardian_email) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ comms_locale: locale }).eq("login_email", lead.guardian_email).contains("roles", ["guardian"]);
  }
  await logEvent(supabase, profile, leadId, "Communication language updated");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Delete a registration entirely (frees any booked slot; cascades test/report). */
export async function deleteLead(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase } = await assertAdmin();
  await supabase.from("availability_slots").update({ status: "open", lead_id: null }).eq("lead_id", leadId).eq("status", "booked");
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) throw new Error(error.message);
  redirect("/admin/registrations");
}

/** Bulk-delete registrations (test-data cleanup). Frees their booked slots. */
export async function bulkDeleteLeads(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const { supabase } = await assertAdmin();
  if (ids.length) {
    await supabase.from("availability_slots").update({ status: "open", lead_id: null }).in("lead_id", ids).eq("status", "booked");
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/admin/registrations");
}

/** Archive (soft-hide) a real lead; un-archive restores it. */
export async function archiveLead(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, profile } = await assertAdmin();
  await supabase.from("leads").update({ archived: true }).eq("id", leadId);
  await logEvent(supabase, profile, leadId, "Request archived");
  redirect("/admin/registrations");
}
export async function unarchiveLead(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, profile } = await assertAdmin();
  await supabase.from("leads").update({ archived: false }).eq("id", leadId);
  await logEvent(supabase, profile, leadId, "Archive removed");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Cancel a lead's booked intro slot (frees it back to open). */
export async function cancelBooking(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const { supabase, profile } = await assertAdmin();
  await supabase.from("availability_slots").update({ status: "open", lead_id: null }).eq("lead_id", leadId).eq("status", "booked");
  await supabase.from("leads").update({ status: "new" }).eq("id", leadId).eq("status", "booked");
  await logEvent(supabase, profile, leadId, "Booking cancelled");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Reschedule: free the current slot and book a new open one. */
export async function rebookByAdmin(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  if (!slotId) throw new Error(await adminErr("pickSlot"));
  const { supabase, profile } = await assertAdmin();
  await supabase.from("availability_slots").update({ status: "open", lead_id: null }).eq("lead_id", leadId).eq("status", "booked");
  const { data: claimed, error } = await supabase
    .from("availability_slots")
    .update({ status: "booked", lead_id: leadId })
    .eq("id", slotId)
    .eq("status", "open")
    .select("id");
  if (error || !claimed?.length) throw new Error(await adminErr("slotUnavailable"));
  await supabase.from("leads").update({ status: "booked" }).eq("id", leadId).eq("status", "new");
  await logEvent(supabase, profile, leadId, "Booking rescheduled");
  revalidatePath(`/admin/registrations/${leadId}`);
}

/** Save an internal ops note on a lead (not shown to the guardian). */
export async function updateOpsNote(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const note = String(formData.get("opsNote") ?? "").trim() || null;
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("leads").update({ ops_note: note }).eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/registrations/${leadId}`);
}

/* ===== Learning phase: enrollments & monthly invoices ===== */

/** Start a monthly subscription for an active student. */
export async function createEnrollment(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const monthly_fee = Math.max(0, Number(formData.get("monthlyFee") ?? 0));
  const spmRaw = String(formData.get("sessionsPerMonth") ?? "").trim();
  const sessions_per_month = spmRaw ? Number(spmRaw) : null;
  const { supabase, profile } = await assertAdmin();

  const { data: learner } = await supabase.from("profiles").select("assigned_instructor_id").eq("id", learnerId).maybeSingle();
  let instructorId: string | null = learner?.assigned_instructor_id ?? null;
  if (!instructorId) {
    try {
      instructorId = await defaultInstructorId(profile.tenant_id);
    } catch {
      instructorId = null;
    }
  }

  const { error } = await supabase.from("enrollments").insert({
    tenant_id: profile.tenant_id,
    learner_id: learnerId,
    instructor_id: instructorId,
    monthly_fee,
    sessions_per_month,
    status: "active",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

/** Update the plan (fee / sessions) of an enrollment. */
export async function updateEnrollment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const monthly_fee = Math.max(0, Number(formData.get("monthlyFee") ?? 0));
  const spmRaw = String(formData.get("sessionsPerMonth") ?? "").trim();
  const sessions_per_month = spmRaw ? Number(spmRaw) : null;
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("enrollments").update({ monthly_fee, sessions_per_month }).eq("id", enrollmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

/** Generate this month's invoice for an enrollment (idempotent per month). */
export async function generateMonthlyInvoice(formData: FormData) {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase, profile } = await assertAdmin();
  const { data: enr } = await supabase.from("enrollments").select("id, monthly_fee, learner_id").eq("id", enrollmentId).single();
  if (!enr) throw new Error(await adminErr("enrollmentNotFound"));

  const d = new Date();
  const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const due = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { error } = await supabase.from("invoices").upsert(
    { tenant_id: profile.tenant_id, enrollment_id: enr.id, learner_id: enr.learner_id, period, amount: enr.monthly_fee, status: "pending", due_date: due },
    { onConflict: "enrollment_id,period", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

/** Mark an invoice paid / pending / void. */
export async function setInvoiceStatus(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["pending", "paid", "void"].includes(status)) throw new Error(await adminErr("invalidInvoiceStatus"));
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("invoices")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

/* ===== Learning phase: requests (cases) & enrollment transitions ===== */

export async function createRequest(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const type = String(formData.get("type") ?? "");
  const details = String(formData.get("details") ?? "").trim() || null;
  if (!["pause", "cancel", "complaint", "other"].includes(type)) throw new Error(await adminErr("invalidRequestType"));
  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase.from("requests").insert({ tenant_id: profile.tenant_id, learner_id: learnerId, type, details, created_by: profile.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
  revalidatePath("/admin/requests");
}

export async function updateRequestStatus(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const status = String(formData.get("status") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim() || null;
  if (!["open", "in_progress", "closed"].includes(status)) throw new Error(await adminErr("invalidStatus"));
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("requests")
    .update({ status, resolution, closed_at: status === "closed" ? new Date().toISOString() : null })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
  revalidatePath("/admin/requests");
}

export async function pauseEnrollment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("enrollments").update({ status: "paused", paused_at: new Date().toISOString() }).eq("id", enrollmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

export async function resumeEnrollment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("enrollments").update({ status: "active", paused_at: null }).eq("id", enrollmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

export async function cancelEnrollment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("enrollments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("id", enrollmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

/* ===== Learning phase: periodic guardian evaluation ===== */

/** Record (or update) this month's guardian evaluation for a student. */
export async function saveEvaluation(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };
  const teacher_rating = num("teacherRating");
  const platform_rating = num("platformRating");
  const recommend = num("recommend");
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const { supabase, profile } = await assertAdmin();
  const d = new Date();
  const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const { error } = await supabase
    .from("evaluations")
    .upsert(
      { tenant_id: profile.tenant_id, learner_id: learnerId, period, teacher_rating, platform_rating, recommend, comment },
      { onConflict: "learner_id,period" },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${learnerId}`);
}

/** Update (upsert) a teacher's profile metadata. */
export async function updateTeacherProfile(formData: FormData) {
  const instructorId = String(formData.get("instructorId") ?? "");
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase.from("teacher_profiles").upsert(
    {
      tenant_id: profile.tenant_id,
      instructor_id: instructorId,
      bio: get("bio"),
      languages: get("languages"),
      specialties: get("specialties"),
      phone: get("phone"),
      start_date: get("startDate"),
      status: get("status") === "inactive" ? "inactive" : "active",
      notes: get("notes"),
    },
    { onConflict: "instructor_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/teachers/${instructorId}`);
}

/** Admin sign-out. */
export async function adminLogout() {
  const { supabase } = await assertAdmin();
  await supabase.auth.signOut();
  redirect("/studio/login");
}

// — Intro/trial session availability (admin-owned, independent of any teacher) —

/** Regenerate the bookable intro slots from the admin's intro availability rules. */
export async function regenerateIntroSlots() {
  const { supabase, user, profile } = await assertAdmin();
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").eq("id", profile.tenant_id).maybeSingle();
  const timezone = tenant?.timezone ?? "Asia/Riyadh";
  const breakMinutes = tenant?.slot_break_minutes ?? 15;

  const { data: rules } = await supabase.from("intro_availability_rules").select("id, weekday, start_time, end_time, slot_minutes").eq("active", true);
  const mapped: Rule[] = (rules ?? []).map((r: { id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number }) => ({
    id: r.id, instructor_id: user.id, weekday: r.weekday, start_time: r.start_time, end_time: r.end_time, slot_minutes: r.slot_minutes,
  }));
  const desired = expandSlots({ rules: mapped, exceptionDates: new Set<string>(), timezone, horizonWeeks: HORIZON_WEEKS, breakMinutes });

  const admin = createAdminClient();
  if (desired.length) {
    const rows = desired.map((d) => ({ tenant_id: profile.tenant_id, instructor_id: user.id, starts_at: d.starts_at, duration_minutes: d.duration_minutes, status: "open", source_rule_id: d.source_rule_id }));
    const { error } = await admin.from("availability_slots").upsert(rows, { onConflict: "instructor_id,starts_at", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  const desiredEpochs = new Set(desired.map((d) => Date.parse(d.starts_at)));
  const nowIso = new Date().toISOString();
  const { data: existing } = await admin.from("availability_slots").select("id, starts_at").eq("instructor_id", user.id).eq("status", "open").gte("starts_at", nowIso);
  const stale = (existing ?? []).filter((s: { id: string; starts_at: string }) => !desiredEpochs.has(Date.parse(s.starts_at))).map((s: { id: string }) => s.id);
  if (stale.length) await admin.from("availability_slots").delete().in("id", stale);
  revalidatePath("/admin/registrations", "layout");
}

export async function addIntroRule(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);
  if (Number.isNaN(weekday) || !startTime || !endTime) throw new Error(await adminErr("completeSlotData"));
  if (endTime <= startTime) throw new Error(await adminErr("endAfterStart"));
  const { supabase, profile } = await assertAdmin();
  const { error } = await supabase.from("intro_availability_rules").insert({ tenant_id: profile.tenant_id, weekday, start_time: startTime, end_time: endTime, slot_minutes: slotMinutes });
  if (error) throw new Error(error.message);
  await regenerateIntroSlots();
}

export async function deleteIntroRule(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const { supabase } = await assertAdmin();
  await supabase.from("availability_slots").delete().eq("source_rule_id", id).eq("status", "open").gte("starts_at", new Date().toISOString());
  const { error } = await supabase.from("intro_availability_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await regenerateIntroSlots();
}
