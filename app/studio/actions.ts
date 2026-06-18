"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateItem,
  generateSessionReportDraft,
  generatePlacementQuestions,
  generatePlan,
  generateLeadTest,
} from "@/lib/generation/service";
import { homePathForRoles } from "@/lib/roles";
import type { ItemFormat, Difficulty } from "@/lib/items";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("roles").eq("id", user!.id).single();
  redirect(homePathForRoles(profile?.roles));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/studio/login");
}

/** Instructor: generate an original draft item for an objective (server-side Claude call). */
export async function generateDraft(formData: FormData) {
  const objectiveId = String(formData.get("objectiveId") ?? "");
  const format = String(formData.get("format") ?? "") as ItemFormat;
  const difficulty = String(formData.get("difficulty") ?? "") as Difficulty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  // RLS guarantees the objective is in the instructor's tenant.
  const { data: obj, error } = await supabase
    .from("objectives")
    .select("id, tenant_id, description, track, level")
    .eq("id", objectiveId)
    .single();
  if (error || !obj) throw new Error("Objective not found");

  const gen = await generateItem({
    objective: { description: obj.description, track: obj.track, level: obj.level },
    format,
    difficulty,
  });

  // Keep the answer key out of student-facing content (see migration 0008).
  const { answer, explanation, rubric, ...studentContent } = (gen.content ?? {}) as Record<
    string,
    unknown
  >;

  // Inserted under the instructor's own session — RLS checks tenant + role.
  const { data: item, error: insErr } = await supabase
    .from("items")
    .insert({
      tenant_id: obj.tenant_id,
      objective_id: obj.id,
      format,
      difficulty,
      prompt: gen.prompt,
      content: studentContent,
      origin: "ai",
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insErr || !item) throw new Error(insErr?.message ?? "Failed to save item");

  const { error: keyErr } = await supabase.from("item_keys").insert({
    item_id: item.id,
    tenant_id: obj.tenant_id,
    answer: answer ?? null,
    explanation: typeof explanation === "string" ? explanation : null,
    rubric: typeof rubric === "string" ? rubric : null,
  });
  if (keyErr) throw new Error(keyErr.message);

  revalidatePath("/studio");
}

export async function approveItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { error } = await supabase
    .from("items")
    .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

export async function rejectItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("items").update({ status: "rejected" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/** Assign an approved item to a learner (so it appears in their practice). */
export async function assignItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  if (!learnerId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: item } = await supabase.from("items").select("id, tenant_id, status").eq("id", itemId).single();
  if (!item) throw new Error("Item not found");
  if (item.status !== "approved") throw new Error("Only approved items can be assigned");

  const { error } = await supabase.from("assignments").insert({
    tenant_id: item.tenant_id,
    item_id: itemId,
    learner_id: learnerId,
    assigned_by: user.id,
  });
  // ignore "already assigned" (unique violation)
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/studio");
}

/** Schedule a 1:1 session. scheduledAt is a UTC ISO string from the client. */
export async function scheduleSession(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const duration = Number(formData.get("duration") ?? 30);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  if (!learnerId || !scheduledAt) throw new Error("Choose a student and a time.");

  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !(profile.roles as string[]).includes("instructor")) throw new Error("Only an instructor can schedule.");

  const { error } = await supabase.from("sessions").insert({
    tenant_id: profile.tenant_id,
    instructor_id: user.id,
    learner_id: learnerId,
    scheduled_at: scheduledAt,
    duration_minutes: duration,
  });
  if (error) {
    throw new Error(error.code === "23P01" ? "That time overlaps an existing session." : error.message);
  }
  revalidatePath("/studio");
}

/** Write a draft report for a session (reaches the family only once approved). */
export async function createReport(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const strengths = String(formData.get("strengths") ?? "").trim();
  const improve = String(formData.get("improve") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  if (!summary) throw new Error("Write a short summary.");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, tenant_id, learner_id")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found");

  const { error } = await supabase.from("session_reports").insert({
    session_id: session.id,
    tenant_id: session.tenant_id,
    learner_id: session.learner_id,
    summary,
    strengths: strengths || null,
    improve: improve || null,
    status: "draft",
  });
  if (error) throw new Error(error.code === "23505" ? "A report already exists for this session." : error.message);
  revalidatePath("/studio");
}

export async function approveReport(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_reports")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/** Generate a draft report from the learner's progress (teacher edits + approves). */
export async function draftReportWithAI(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, tenant_id, learner_id")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found");

  const { data: learner } = await supabase.from("profiles").select("full_name").eq("id", session.learner_id).single();
  const { data: prog } = await supabase
    .from("progress_records")
    .select("attempts, correct, completions, objectives(description)")
    .eq("learner_id", session.learner_id);

  const progress = (prog ?? []).map((p) => {
    const o = Array.isArray(p.objectives) ? p.objectives[0] : p.objectives;
    return {
      objective: (o as { description?: string })?.description ?? "Objective",
      attempts: p.attempts as number,
      correct: p.correct as number,
      completions: p.completions as number,
    };
  });

  const draft = await generateSessionReportDraft({
    learnerName: learner?.full_name ?? "the student",
    progress,
  });

  const { error } = await supabase.from("session_reports").insert({
    session_id: session.id,
    tenant_id: session.tenant_id,
    learner_id: session.learner_id,
    summary: draft.summary,
    strengths: draft.strengths,
    improve: draft.improve,
    status: "draft",
  });
  if (error) throw new Error(error.code === "23505" ? "A report already exists for this session." : error.message);
  revalidatePath("/studio");
}

/** Start a placement test for a learner: generate questions across CEFR levels. */
export async function startPlacement(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !(profile.roles as string[]).includes("instructor")) {
    throw new Error("Only an instructor can start a placement test.");
  }

  const questions = await generatePlacementQuestions(["A1", "A2", "B1"]);
  if (questions.length === 0) throw new Error("Generation returned no questions.");

  const { data: test, error } = await supabase
    .from("placement_tests")
    .insert({ tenant_id: profile.tenant_id, learner_id: learnerId, status: "in_progress" })
    .select("id")
    .single();
  if (error || !test) throw new Error(error?.message ?? "Failed to create placement test");

  const rows = questions.map((q, i) => ({
    placement_test_id: test.id,
    tenant_id: profile.tenant_id,
    level: q.level,
    format: "multiple_choice",
    prompt: q.prompt,
    content: { options: q.options },
    answer: q.answer,
    position: i,
  }));
  const { error: qErr } = await supabase.from("placement_questions").insert(rows);
  if (qErr) throw new Error(qErr.message);

  revalidatePath("/studio");
}

/** Generate a draft study plan for a learner (informed by their placement level). */
export async function startPlan(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !(profile.roles as string[]).includes("instructor")) {
    throw new Error("Only an instructor can generate a plan.");
  }

  const { data: learner } = await supabase.from("profiles").select("full_name").eq("id", learnerId).single();
  const { data: placement } = await supabase
    .from("placement_tests")
    .select("suggested_level")
    .eq("learner_id", learnerId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const level = placement?.suggested_level ?? "A1";

  const plan = await generatePlan(level, learner?.full_name ?? "the student");

  const { error } = await supabase.from("study_plans").insert({
    tenant_id: profile.tenant_id,
    learner_id: learnerId,
    title: plan.title,
    level,
    items: plan.items,
    status: "draft",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

export async function approvePlan(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("study_plans")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/** Turn a plan's objectives into real objectives so items can be generated/assigned. */
export async function materializePlanObjectives(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: plan } = await supabase
    .from("study_plans")
    .select("tenant_id, items")
    .eq("id", planId)
    .single();
  if (!plan) throw new Error("Plan not found");

  const items = (plan.items as { description: string; level: string }[]) ?? [];
  if (items.length === 0) return;

  const rows = items.map((it) => ({
    tenant_id: plan.tenant_id,
    track: "cefr",
    level: it.level,
    description: it.description,
    created_by: user.id,
  }));
  const { error } = await supabase.from("objectives").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/** Edit a draft report's text before approving. */
export async function updateReport(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const strengths = String(formData.get("strengths") ?? "").trim();
  const improve = String(formData.get("improve") ?? "").trim();
  if (!summary) throw new Error("Write a short summary.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_reports")
    .update({ summary, strengths: strengths || null, improve: improve || null })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/** Instructor opens an intro-session time slot for booking. */
export async function addSlot(formData: FormData) {
  const startsAt = String(formData.get("startsAt") ?? "");
  const duration = Number(formData.get("duration") ?? 30);
  if (!startsAt) throw new Error("اختر وقتاً.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !(profile.roles as string[]).includes("instructor")) throw new Error("للمعلّم فقط.");

  const { error } = await supabase.from("availability_slots").insert({
    tenant_id: profile.tenant_id,
    instructor_id: user.id,
    starts_at: startsAt,
    duration_minutes: duration,
    status: "open",
  });
  if (error) throw new Error(error.code === "23505" ? "هذا الوقت مُضافٌ مسبقاً." : error.message);
  revalidatePath("/studio");
}

export async function removeSlot(formData: FormData) {
  const id = String(formData.get("slotId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("availability_slots").delete().eq("id", id).eq("status", "open");
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/** Generate a tailored placement test for a lead (draft → teacher reviews → approves). */
export async function generateLeadTestAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !(profile.roles as string[]).includes("instructor")) throw new Error("للمعلّم فقط.");

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
  revalidatePath("/studio");
}

/** Approve a draft lead test and make it shareable (generates a signed token). */
export async function approveLeadTestAction(formData: FormData) {
  const testId = String(formData.get("testId") ?? "");
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("lead_tests")
    .update({ status: "shared", share_token: token, shared_at: new Date().toISOString() })
    .eq("id", testId);
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

/**
 * Provision real accounts from a lead: creates the guardian + the child's login,
 * links them with consent, carries over the placement level, and returns the
 * generated credentials ONCE for the teacher to share (not stored).
 */
export async function provisionAccounts(
  _prev: { error?: string; guardian?: { email: string; password: string }; student?: { email: string; password: string } } | undefined,
  formData: FormData,
) {
  const leadId = String(formData.get("leadId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !(profile.roles as string[]).includes("instructor")) return { error: "للمعلّم فقط." };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, tenant_id, guardian_name, guardian_email, student_name, status")
    .eq("id", leadId)
    .single();
  if (!lead) return { error: "الطلب غير موجود." };
  if (lead.status === "converted") return { error: "جُهّزت الحسابات مسبقاً." };

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
  await admin.from("profiles").insert({ id: s.user.id, tenant_id: lead.tenant_id, full_name: lead.student_name, roles: ["learner"], is_minor: true, login_email: sEmail });
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
  revalidatePath("/studio");
  return { guardian: { email: lead.guardian_email, password: gPassword }, student: { email: sEmail, password: sPassword } };
}
