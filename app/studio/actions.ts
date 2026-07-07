"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateSessionReportDraft,
  generatePlacementQuestions,
  generateDiagnostic,
} from "@/lib/generation/service";
import { aggregatePlanItems } from "@/lib/curriculum/aggregatePlan";
import { homePathForRoles } from "@/lib/roles";
import { buildManualEvidence } from "@/lib/progress/evidence";

// The teacher studio is English by internal decision — system messages are English.
const studioErr = async (key: string) => (await getTranslations({ locale: "en", namespace: "studio.errors" }))(key);

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
  revalidatePath("/studio", "layout");
}

export async function rejectItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("items").update({ status: "rejected" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/studio", "layout");
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

  const sessionId = String(formData.get("sessionId") ?? "").trim() || null;
  const { error } = await supabase.from("assignments").insert({
    tenant_id: item.tenant_id,
    item_id: itemId,
    learner_id: learnerId,
    assigned_by: user.id,
    session_id: sessionId,
  });
  // ignore "already assigned" (unique violation)
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/studio", "layout");
}

/** Schedule a 1:1 session. scheduledAt is a UTC ISO string from the client. */
export async function scheduleSession(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const duration = Number(formData.get("duration") ?? 30);
  const lessonTitle = String(formData.get("lessonTitle") ?? "").trim() || null;
  const rawIndex = String(formData.get("planItemIndex") ?? "").trim();
  const planItemIndex = rawIndex === "" ? null : Number(rawIndex);

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
    lesson_title: lessonTitle,
    plan_item_index: planItemIndex,
  });
  if (error) {
    throw new Error(error.code === "23P01" ? "That time overlaps an existing session." : error.message);
  }
  revalidatePath("/studio", "layout");
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
  revalidatePath("/studio", "layout");
}

export async function approveReport(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_reports")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/studio", "layout");
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
    .select("id, tenant_id, learner_id, lesson_title")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found");

  const { data: learner } = await supabase.from("profiles").select("full_name").eq("id", session.learner_id).single();

  // PA-1: parent comms are Arabic-only — the report is always drafted in Arabic (no longer keyed to
  // the guardian's comms_locale). The teacher reviews the Arabic draft before approving.
  const draft = await generateSessionReportDraft({
    learnerName: learner?.full_name ?? "the student",
    lessonTitle: session.lesson_title,
    engagement: String(formData.get("engagement") ?? "").trim() || undefined,
    comprehension: String(formData.get("comprehension") ?? "").trim() || undefined,
    behavior: String(formData.get("behavior") ?? "").trim() || undefined,
    focusNext: String(formData.get("focusNext") ?? "").trim() || undefined,
    teacherNote: String(formData.get("teacherNote") ?? "").trim() || undefined,
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
  revalidatePath("/studio", "layout");
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

  revalidatePath("/studio", "layout");
}

/**
 * Clear a learner's existing plan(s) before (re)creating one — so rebuilding from
 * the catalog never leaves orphans. (Progress lives in the catalog model —
 * objective_progress, keyed by curriculum objective_id — independent of the plan.)
 */
async function clearLearnerPlans(supabase: Awaited<ReturnType<typeof createClient>>, learnerId: string) {
  const { data: plans } = await supabase.from("study_plans").select("id").eq("learner_id", learnerId);
  const ids = (plans ?? []).map((p: { id: string }) => p.id);
  if (!ids.length) return;
  await supabase.from("study_plans").delete().in("id", ids);
}

/**
 * Build a study plan DETERMINISTICALLY from the Ward Curriculum catalog — all of
 * the confirmed entry level's objectives, in catalog order, no AI/authoring.
 * id = objective_id (real, stable). This is the ONLY plan-creation path.
 */
export async function startPlanFromCatalog(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  if (!learnerId) throw new Error(await studioErr("noStudent"));
  const { supabase, user, tenantId } = await instructorCtx();
  const { data: placement } = await supabase
    .from("placement_tests")
    .select("suggested_level, confirmed_level")
    .eq("learner_id", learnerId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const level = placement?.confirmed_level ?? placement?.suggested_level ?? "A1";

  const items = await aggregatePlanItems(supabase, level);
  if (items.length === 0) throw new Error(await studioErr("noCatalogObjectives"));

  await clearLearnerPlans(supabase, learnerId);
  const { error } = await supabase.from("study_plans").insert({
    tenant_id: tenantId,
    learner_id: learnerId,
    title: `Ward Curriculum · Level ${level}`,
    level,
    items, // id = objective_id (no randomUUID — real catalog ids)
    status: "draft",
    track: "cefr",
    scope_label: `Ward Curriculum · Level ${level}`,
    milestone_label: `Level assessment on completing ${level}`,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

/** Lock a catalog-built plan: preview → approve → locked (status=approved). */
export async function approvePlan(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const { supabase } = await instructorCtx();

  const { data: plan } = await supabase.from("study_plans").select("status").eq("id", planId).single();
  if (!plan) throw new Error(await studioErr("planNotFound"));

  // The plan lives in study_plans.items (catalog-sourced: id = curriculum
  // objective_id). Progress is tracked independently against curriculum_objectives
  // + objective_progress — no materialization into the old objectives table.
  // Approve = lock the plan (gate: preview → approve → locked).
  if (plan.status !== "approved") {
    const { error } = await supabase.from("study_plans").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", planId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/studio", "layout");
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
  revalidatePath("/studio", "layout");
}

// — Curriculum resources & assessments (the student detail page) —

/** Tenant + instructor guard for the actions below. */
// (recordObjectiveAssessment — the retired free-rating action that wrote
// objective_assessments via trigger 0056 — was removed in AE-3. Teacher input is now
// evidence-based: manual grades go through gradeManualSubmission → objective_evidence.)

async function instructorCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const { data: profile } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!profile || !((profile.roles as string[]) ?? []).includes("instructor")) throw new Error("Only an instructor.");
  return { supabase, user, tenantId: profile.tenant_id as string };
}

// AE-6 (parallel writer · objective_evidence): persist a teacher's §12-rubric grade of a MANUAL
// item as ONE per-objective evidence row. This is the replacement for the retired free rating
// field — it grades a SPECIFIC manual submission (not the read-only progress page; surface
// wiring is a later gate). Inert log (read by nothing yet); the old model + trigger 0056 are
// untouched. Behind the instructor auth guard.
export async function gradeManualSubmission(input: {
  itemId: string;
  learnerId: string;
  objectiveId: string;
  value: number;
  kind: "homework" | "test";
}) {
  const { tenantId } = await instructorCtx();
  const ev = buildManualEvidence({ objective_id: input.objectiveId, value: input.value, kind: input.kind });
  if (!ev) throw new Error("A manual grade must target an objective with a rubric value of 0, 4, 7, or 10.");
  const admin = createAdminClient();
  const { error } = await admin.from("objective_evidence").insert({
    tenant_id: tenantId,
    learner_id: input.learnerId,
    objective_id: ev.objective_id,
    value: ev.value,
    source: ev.source,
    item_id: input.itemId,
  });
  if (error) throw new Error(error.message);
}

const RESOURCE_BUCKET = "learning-resources";
const RESOURCE_MAX_BYTES = 25 * 1024 * 1024;

/** Upload a learning-resource file (PDF/Word/PowerPoint/Excel…) to private storage. */
export async function addResource(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const file = formData.get("file") as File | null;
  if (!learnerId) throw new Error(await studioErr("noStudent"));
  if (!file || file.size === 0) throw new Error(await studioErr("chooseFile"));
  if (file.size > RESOURCE_MAX_BYTES) throw new Error(await studioErr("fileTooBig25"));

  const { user, tenantId } = await instructorCtx();
  const admin = createAdminClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${tenantId}/${learnerId}/${crypto.randomUUID()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const up = await admin.storage.from(RESOURCE_BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
  if (up.error) throw new Error(up.error.message);

  const title = String(formData.get("title") ?? "").trim() || file.name;
  const { error } = await admin.from("learning_resources").insert({
    tenant_id: tenantId, learner_id: learnerId, title, note,
    file_path: path, file_name: file.name, mime_type: file.type || null, size_bytes: file.size, created_by: user.id,
  });
  if (error) {
    await admin.storage.from(RESOURCE_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function removeResource(formData: FormData) {
  const id = String(formData.get("resourceId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  await instructorCtx();
  const admin = createAdminClient();
  const { data: row } = await admin.from("learning_resources").select("file_path").eq("id", id).maybeSingle();
  const { error } = await admin.from("learning_resources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (row?.file_path) await admin.storage.from(RESOURCE_BUCKET).remove([row.file_path]);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function createAssessment(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const scope = String(formData.get("scope") ?? "unit");
  const scheduledFor = String(formData.get("scheduledFor") ?? "").trim() || null;
  if (!learnerId || !title) throw new Error(await studioErr("enterTestTitle"));
  const { supabase, user, tenantId } = await instructorCtx();
  const { error } = await supabase.from("assessments").insert({
    tenant_id: tenantId,
    learner_id: learnerId,
    title,
    scope: ["unit", "term", "plan"].includes(scope) ? scope : "unit",
    scheduled_for: scheduledFor,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function recordAssessment(formData: FormData) {
  const id = String(formData.get("assessmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const rawScore = String(formData.get("score") ?? "").trim();
  const rawMax = String(formData.get("maxScore") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const { supabase } = await instructorCtx();
  const { error } = await supabase
    .from("assessments")
    .update({
      status: "completed",
      score: rawScore === "" ? null : Number(rawScore),
      max_score: rawMax === "" ? null : Number(rawMax),
      notes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function removeAssessment(formData: FormData) {
  const id = String(formData.get("assessmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase } = await instructorCtx();
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

/** Generate an AI unit assessment from the unit's objectives → a DRAFT the teacher reviews. */
/** AE-7: assemble a unit test by HAND-PICKING pre-built bank items (no AI generation).
 *  Snapshots the chosen approved bank items into a draft assessment's assessment_questions —
 *  copying each item's answer (from item_keys) into assessment_questions.answer, the store the
 *  FROZEN auto-grade→objective_evidence path reads (R4), and carrying objective_id + grading='auto'
 *  so the unit test feeds per-objective evidence UNCHANGED. */
export async function assembleUnitTest(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const curriculumUnitId = String(formData.get("curriculumUnitId") ?? "").trim();
  const itemIds = formData.getAll("itemIds").map((v) => String(v)).filter(Boolean);
  if (!learnerId || !curriculumUnitId) throw new Error(await studioErr("chooseUnit"));
  if (itemIds.length === 0) throw new Error(await studioErr("pickQuestions"));
  const { supabase, user, tenantId } = await instructorCtx();

  const { data: cUnit } = await supabase.from("curriculum_units").select("unit_id, title_ar, title_en").eq("unit_id", curriculumUnitId).single();
  if (!cUnit) throw new Error(await studioErr("unknownUnit"));
  const unit = (cUnit.title_en ?? cUnit.title_ar) as string;

  // The chosen APPROVED bank items + their hidden answers (item_keys) — instructor-readable.
  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, objective_id, item_keys(answer)")
    .in("id", itemIds)
    .eq("status", "approved");
  if (!items?.length) throw new Error(await studioErr("noBankItems"));

  // The objective's skill → assessment_questions.skill (required, one of the four).
  const objIds = [...new Set(items.map((it: any) => it.objective_id).filter(Boolean) as string[])];
  const { data: objs } = await supabase.from("curriculum_objectives").select("objective_id, skill").in("objective_id", objIds.length ? objIds : ["—"]);
  const skillByObj = new Map<string, string>((objs ?? []).map((o: any) => [o.objective_id, o.skill]));

  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({ tenant_id: tenantId, learner_id: learnerId, title: `Unit test: ${unit}`, scope: "unit", unit, curriculum_unit_id: curriculumUnitId, status: "draft", created_by: user.id })
    .select("id")
    .single();
  if (error || !assessment) throw new Error(error?.message ?? (await studioErr("createTestFailed")));

  const rows = items.map((it: any, i: number) => {
    const key = Array.isArray(it.item_keys) ? it.item_keys[0] : it.item_keys;
    const skill = skillByObj.get(it.objective_id) ?? "reading";
    return {
      assessment_id: assessment.id,
      tenant_id: tenantId,
      skill: ["listening", "speaking", "reading", "writing"].includes(skill) ? skill : "reading",
      format: it.format ?? "multiple_choice",
      prompt: it.prompt,
      content: it.content ?? {},
      answer: key?.answer ?? null, // R4: answer where the grade path READS it (assessment_questions.answer)
      objective_id: it.objective_id ?? null, // per-objective evidence (AE-1)
      grading: "auto", // so buildAutoEvidence fires → objective_evidence(source auto_test)
      position: i,
    };
  });
  const { error: qErr } = await supabase.from("assessment_questions").insert(rows);
  if (qErr) throw new Error(qErr.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

/** Approve a draft assessment → the child can take it from /learn. */
export async function approveAssessment(formData: FormData) {
  const id = String(formData.get("assessmentId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase } = await instructorCtx();
  const { error } = await supabase.from("assessments").update({ status: "ready" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

// — Recurring weekly lessons (Note 3) —

/** Set a student's fixed weekly lesson slot (weekday 0=Sunday + local time). */
const toMinTime = (t: string) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Add a recurring weekly lesson slot — must fall inside the teacher's availability. */
export async function addLessonSlot(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const weekday = Number(formData.get("weekday"));
  const time = String(formData.get("time") ?? "").trim();
  const duration = Number(formData.get("duration") ?? 45);
  if (!learnerId || Number.isNaN(weekday) || !time) throw new Error(await studioErr("slotDataMissing"));

  const { supabase, user, tenantId } = await instructorCtx();
  const { data: rules } = await supabase.from("availability_rules").select("start_time, end_time").eq("instructor_id", user.id).eq("weekday", weekday).eq("active", true);
  const tMin = toMinTime(time);
  const insideAvailability = (rules ?? []).some((r: { start_time: string; end_time: string }) => tMin >= toMinTime(r.start_time) && tMin + duration <= toMinTime(r.end_time));
  if (!insideAvailability) throw new Error(await studioErr("slotOutsideAvailability"));

  const admin = createAdminClient();
  const { error } = await admin.from("lesson_schedules").upsert(
    { tenant_id: tenantId, learner_id: learnerId, instructor_id: user.id, weekday, time_of_day: time, duration_minutes: duration, active: true },
    { onConflict: "learner_id,weekday,time_of_day" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function removeLessonSlot(formData: FormData) {
  const id = String(formData.get("slotId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase } = await instructorCtx();
  const { error } = await supabase.from("lesson_schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

/**
 * Generate the upcoming weekly sessions for a student from their fixed slot,
 * tying each (in order) to the next not-yet-scheduled lesson in the plan.
 */
export async function generateLessonSessions(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase, user, tenantId } = await instructorCtx();

  const { data: slots } = await supabase.from("lesson_schedules").select("weekday, time_of_day, duration_minutes").eq("learner_id", learnerId).eq("active", true);
  if (!slots || slots.length === 0) throw new Error(await studioErr("addOneSlot"));

  const { data: plan } = await supabase.from("study_plans").select("items, status").eq("learner_id", learnerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan || plan.status !== "approved") throw new Error(await studioErr("approvePlanFirst"));
  const lessons = (plan.items as { description: string }[]) ?? [];

  const { data: existing } = await supabase.from("sessions").select("plan_item_index").eq("learner_id", learnerId);
  const assigned = new Set<number>((existing ?? []).map((s: { plan_item_index: number | null }) => s.plan_item_index).filter((n): n is number => n != null));
  const remaining = lessons.map((it, i) => ({ it, i })).filter(({ i }) => !assigned.has(i));
  if (remaining.length === 0) throw new Error(await studioErr("allLessonsScheduled"));

  const { data: tenant } = await supabase.from("tenants").select("timezone").eq("id", tenantId).maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const now = DateTime.now().setZone(tz);

  // Build upcoming occurrences across ALL weekly slots, then assign lessons chronologically.
  const weeksNeeded = Math.ceil(remaining.length / slots.length) + 1;
  const occurrences: { dt: DateTime; duration: number }[] = [];
  for (const s of slots) {
    const [hh, mm] = String(s.time_of_day).split(":").map(Number);
    const luxonWd = s.weekday === 0 ? 7 : s.weekday;
    let first = now.set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
    first = first.plus({ days: (luxonWd - first.weekday + 7) % 7 });
    if (first <= now) first = first.plus({ weeks: 1 });
    for (let w = 0; w < weeksNeeded; w++) occurrences.push({ dt: first.plus({ weeks: w }), duration: s.duration_minutes });
  }
  occurrences.sort((a, b) => a.dt.toMillis() - b.dt.toMillis());

  for (let k = 0; k < remaining.length && k < occurrences.length; k++) {
    const occ = occurrences[k];
    const { it, i } = remaining[k];
    const { error } = await supabase.from("sessions").insert({
      tenant_id: tenantId, instructor_id: user.id, learner_id: learnerId,
      scheduled_at: occ.dt.toUTC().toISO(), duration_minutes: occ.duration,
      lesson_title: it.description, plan_item_index: i,
    });
    if (error && error.code !== "23P01" && error.code !== "23505") throw new Error(error.message); // skip taken slots
  }
  revalidatePath(`/studio/students/${learnerId}`);
}

// — Manual homework path (Note 4): teacher side —

const HOMEWORK_BUCKET = "homework-files";

async function uploadHomeworkFile(admin: ReturnType<typeof createAdminClient>, tenantId: string, learnerId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${tenantId}/${learnerId}/${crypto.randomUUID()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const up = await admin.storage.from(HOMEWORK_BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
  if (up.error) throw new Error(up.error.message);
  return { path, file };
}

/** Post a manual homework (textbook image + optional worksheets) for a student. */
export async function createManualHomework(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const prompt = formData.get("prompt") as File | null;
  const worksheets = formData.getAll("worksheets").filter((f): f is File => f instanceof File && f.size > 0);
  if (!learnerId || !title) throw new Error(await studioErr("enterHomeworkTitle"));
  if (!prompt || prompt.size === 0) throw new Error(await studioErr("attachHomeworkImage"));
  if (prompt.size > RESOURCE_MAX_BYTES) throw new Error(await studioErr("fileTooBig25"));

  const { user, tenantId } = await instructorCtx();
  const admin = createAdminClient();
  const { data: hw, error } = await admin.from("manual_homework").insert({
    tenant_id: tenantId, learner_id: learnerId, instructor_id: user.id, session_id: sessionId, title, instructions, status: "assigned",
  }).select("id").single();
  if (error || !hw) throw new Error(error?.message ?? (await studioErr("createHomeworkFailed")));

  const files: { kind: string; f: File }[] = [{ kind: "prompt", f: prompt }, ...worksheets.map((f) => ({ kind: "worksheet", f }))];
  for (const { kind, f } of files) {
    const { path } = await uploadHomeworkFile(admin, tenantId, learnerId, f);
    await admin.from("homework_files").insert({ tenant_id: tenantId, manual_homework_id: hw.id, kind, file_path: path, file_name: f.name, mime_type: f.type || null, size_bytes: f.size, uploaded_by: user.id });
  }
  revalidatePath(`/studio/students/${learnerId}`);
}

/** Grade a submitted manual homework. */
export async function gradeManualHomework(formData: FormData) {
  const id = String(formData.get("manualHomeworkId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  const rawScore = String(formData.get("score") ?? "").trim();
  const rawMax = String(formData.get("maxScore") ?? "").trim();
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  const { supabase } = await instructorCtx();
  const { error } = await supabase.from("manual_homework").update({
    status: "graded",
    score: rawScore === "" ? null : Number(rawScore),
    max_score: rawMax === "" ? null : Number(rawMax),
    feedback,
    graded_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function removeManualHomework(formData: FormData) {
  const id = String(formData.get("manualHomeworkId") ?? "");
  const learnerId = String(formData.get("learnerId") ?? "");
  await instructorCtx();
  const admin = createAdminClient();
  const { data: files } = await admin.from("homework_files").select("file_path").eq("manual_homework_id", id);
  const { error } = await admin.from("manual_homework").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const paths = (files ?? []).map((f: { file_path: string }) => f.file_path);
  if (paths.length) await admin.storage.from(HOMEWORK_BUCKET).remove(paths);
  revalidatePath(`/studio/students/${learnerId}`);
}

// — Diagnostic report (Note 1): generated from all the student's inputs —

/** Generate a draft diagnostic from the student's lead form + placement + intro + notes. */
export async function generateDiagnosticReport(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase, user, tenantId } = await instructorCtx();
  const { data: learner } = await supabase.from("profiles").select("full_name").eq("id", learnerId).maybeSingle();

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("id, student_name, student_age, learning_goal, prior_study, english_use, home_language, skill_levels, intro_outcome, intro_notes, ops_note")
    .eq("converted_learner_id", learnerId)
    .maybeSingle();

  let placementLevel: string | null = null;
  if (lead) {
    const { data: lt } = await admin.from("lead_tests").select("suggested_level, confirmed_level").eq("lead_id", lead.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle();
    placementLevel = lt?.confirmed_level ?? lt?.suggested_level ?? null;
  }
  if (!placementLevel) {
    const { data: pt } = await admin.from("placement_tests").select("suggested_level, confirmed_level").eq("learner_id", learnerId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
    placementLevel = pt?.confirmed_level ?? pt?.suggested_level ?? null;
  }

  const report = await generateDiagnostic({
    studentName: lead?.student_name ?? learner?.full_name ?? "the student",
    age: lead?.student_age ?? null,
    goal: lead?.learning_goal ?? null,
    priorStudy: lead?.prior_study ?? null,
    englishUse: lead?.english_use ?? null,
    homeLanguage: lead?.home_language ?? null,
    selfLevels: (lead?.skill_levels as Record<string, string> | null) ?? null,
    placementLevel,
    introOutcome: lead?.intro_outcome ?? null,
    introNotes: lead?.intro_notes ?? null,
    adminNote: lead?.ops_note ?? null,
  });

  const { error } = await supabase.from("diagnostics").upsert(
    { tenant_id: tenantId, learner_id: learnerId, report, status: "draft", created_by: user.id, approved_at: null },
    { onConflict: "learner_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function updateDiagnostic(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const report = String(formData.get("report") ?? "").trim();
  const { supabase } = await instructorCtx();
  const { error } = await supabase.from("diagnostics").update({ report }).eq("learner_id", learnerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

export async function approveDiagnostic(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const { supabase } = await instructorCtx();
  const { error } = await supabase.from("diagnostics").update({ status: "approved", approved_at: new Date().toISOString() }).eq("learner_id", learnerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/students/${learnerId}`);
}

