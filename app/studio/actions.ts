"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateItem, generateSessionReportDraft, generatePlacementQuestions } from "@/lib/generation/service";
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
