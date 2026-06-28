"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { valueForPercent, buildAutoEvidence } from "@/lib/progress/evidence";
import { stageForValue, SKILLS } from "@/lib/skills";

// The child surface is English-pure — error messages are always English.
const learnErrors = () => getTranslations({ locale: "en", namespace: "learn.errors" });

const norm = (s: string) => s.trim().toLowerCase();

function grade(format: string, raw: string, answer: unknown): boolean {
  if (format === "true_false") {
    const a = answer === true || answer === "true";
    return (raw === "true") === a;
  }
  if (format === "multiple_choice" || format === "fill_blank") {
    return typeof answer === "string" && norm(raw) === norm(answer);
  }
  return false;
}

/**
 * A learner submits an answer. Submissions are created here (service role), not
 * by the client, so grading can read the hidden answer key and a learner cannot
 * forge a correct mark. Objective formats are auto-graded; open/audio are left
 * for the teacher / counted as completion. The item is first checked under the
 * learner's own session, so they can only submit to an approved item they see.
 */
export async function submitAnswer(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const raw = String(formData.get("answer") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: item } = await supabase.from("items").select("id, format, objective_id, grading, tenant_id").eq("id", itemId).single();
  if (!item) throw new Error("Item not available");

  const admin = createAdminClient();
  let isCorrect: boolean | null = null;
  let graded = false;
  if (["multiple_choice", "true_false", "fill_blank"].includes(item.format)) {
    const { data: key } = await admin.from("item_keys").select("answer").eq("item_id", itemId).single();
    isCorrect = grade(item.format, raw, key?.answer);
    graded = true;
  }

  const { error } = await admin.from("submissions").insert({
    item_id: itemId,
    learner_id: user.id,
    response: { answer: raw },
    is_correct: isCorrect,
    graded,
    graded_at: graded ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);

  // AE-4 (parallel writer · objective_evidence): an auto-graded, objective-tagged repository
  // homework item → one per-objective evidence row. Current homework items have grading=NULL
  // → skipped (no-op). The submissions insert above is unchanged.
  if (graded) {
    const ev = buildAutoEvidence([{ objective_id: item.objective_id ?? null, grading: item.grading ?? null, correct: isCorrect === true }]);
    if (ev.length) {
      await admin.from("objective_evidence").insert({ tenant_id: item.tenant_id, learner_id: user.id, objective_id: ev[0].objective_id, value: ev[0].value, source: "auto_homework", item_id: item.id });
    }
  }

  revalidatePath("/learn");
}

/** Submit a placement test: graded server-side (hidden answers), then a level is suggested. */
export async function submitPlacement(formData: FormData) {
  const testId = String(formData.get("testId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  // Ownership: a learner can only see their own placement test (RLS).
  const { data: test } = await supabase.from("placement_tests").select("id, status").eq("id", testId).single();
  if (!test || test.status !== "in_progress") throw new Error("Placement test not available");

  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("placement_questions")
    .select("id, level, answer")
    .eq("placement_test_id", testId)
    .order("position");

  const byLevel = new Map<string, { total: number; correct: number }>();
  for (const q of questions ?? []) {
    const raw = String(formData.get(`q_${q.id}`) ?? "");
    const correct = typeof q.answer === "string" && norm(raw) === norm(q.answer as string);
    await admin.from("placement_questions").update({ response: { answer: raw }, is_correct: correct }).eq("id", q.id);
    const s = byLevel.get(q.level) ?? { total: 0, correct: 0 };
    s.total += 1;
    if (correct) s.correct += 1;
    byLevel.set(q.level, s);
  }

  // Suggested level: the highest level passed (>= half correct).
  const order = ["A1", "A2", "B1"];
  let suggested = "A1";
  for (const lvl of order) {
    const s = byLevel.get(lvl);
    if (s && s.correct >= Math.ceil(s.total / 2)) suggested = lvl;
  }

  await admin
    .from("placement_tests")
    .update({ status: "completed", suggested_level: suggested, completed_at: new Date().toISOString() })
    .eq("id", testId);

  revalidatePath("/learn");
}

/** A learner takes a unit assessment: graded server-side (hidden answers) into a per-skill result. */
export async function submitAssessment(formData: FormData) {
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  // Ownership: a learner can only see their own assessment (RLS).
  const { data: a } = await supabase.from("assessments").select("id, status, learner_id, tenant_id, curriculum_unit_id").eq("id", assessmentId).single();
  if (!a || a.learner_id !== user.id || a.status !== "ready") throw new Error((await learnErrors())("testUnavailable"));

  const admin = createAdminClient();
  const { data: questions } = await admin.from("assessment_questions").select("id, skill, answer, objective_id, grading").eq("assessment_id", assessmentId).order("position");

  const bySkill = new Map<string, { correct: number; total: number }>();
  const gradedQuestions: { objective_id: string | null; grading: string | null; correct: boolean }[] = [];
  let correctTotal = 0;
  for (const q of questions ?? []) {
    const raw = String(formData.get(`q_${q.id}`) ?? "");
    const correct = typeof q.answer === "string" && norm(raw) === norm(q.answer as string);
    await admin.from("assessment_questions").update({ response: { answer: raw }, is_correct: correct }).eq("id", q.id);
    gradedQuestions.push({ objective_id: q.objective_id ?? null, grading: q.grading ?? null, correct });
    if (correct) correctTotal += 1;
    // Per-skill result is one of the four assessed skills only (any legacy
    // off-list tag still scores toward the total but never gets a skill row).
    if (!(SKILLS as readonly string[]).includes(q.skill)) continue;
    const s = bySkill.get(q.skill) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (correct) s.correct += 1;
    bySkill.set(q.skill, s);
  }

  const total = (questions ?? []).length;
  const result = Object.fromEntries([...bySkill.entries()]);
  await admin
    .from("assessments")
    .update({ status: "completed", score: correctTotal, max_score: total, result, completed_at: new Date().toISOString() })
    .eq("id", assessmentId);

  // Auto evidence → the new model: each skill's % → percent key → value →
  // objective_assessments(evidence='auto') for every catalog objective of
  // (unit, skill). The DB trigger rolls it into the decaying average. Only the
  // four assessed skills exist in the catalog; any off-list tag is skipped.
  if (a.curriculum_unit_id) {
    const { data: catObjs } = await admin
      .from("curriculum_objectives").select("objective_id, skill").eq("unit_id", a.curriculum_unit_id);
    const rows: { tenant_id: string; student_id: string; objective_id: string; value: number; state: string; evidence: string }[] = [];
    for (const skill of SKILLS) {
      const s = bySkill.get(skill);
      if (!s || s.total === 0) continue;
      const value = valueForPercent((s.correct / s.total) * 100);
      for (const o of (catObjs ?? []).filter((o) => o.skill === skill)) {
        rows.push({ tenant_id: a.tenant_id, student_id: a.learner_id, objective_id: o.objective_id, value, state: stageForValue(value), evidence: "auto" });
      }
    }
    if (rows.length) await admin.from("objective_assessments").insert(rows);
  }

  // AE-4 (parallel writer · objective_evidence): per-OBJECTIVE auto evidence keyed on each
  // question's AE-1 objective_id (replaces the per-skill flattening above). Skips
  // NULL-objective / non-auto questions → no-op on current untagged content. The block above
  // (objective_assessments + trigger 0056) is unchanged and stays the live source until AE-8.
  const evidence = buildAutoEvidence(gradedQuestions);
  if (evidence.length) {
    await admin.from("objective_evidence").insert(
      evidence.map((e) => ({ tenant_id: a.tenant_id, learner_id: a.learner_id, objective_id: e.objective_id, value: e.value, source: "auto_test", item_id: null })),
    );
  }

  revalidatePath("/learn");
}

/**
 * A learner uploads a photo of their handwritten solution to a manual homework
 * (Note 4). The homework is first checked under the learner's own session (RLS),
 * then the file is stored and the status flipped to "submitted" via service role
 * (the learner has no write policy — they cannot grade or alter the score).
 */
export async function submitManualHomework(formData: FormData) {
  const id = String(formData.get("manualHomeworkId") ?? "");
  const file = formData.get("file") as File | null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const te = await learnErrors();
  if (!file || file.size === 0) throw new Error(te("uploadImage"));
  if (file.size > 25 * 1024 * 1024) throw new Error(te("fileTooBig"));

  // RLS guarantees the learner only sees their own homework.
  const { data: hw } = await supabase.from("manual_homework").select("id, tenant_id, learner_id").eq("id", id).maybeSingle();
  if (!hw || hw.learner_id !== user.id) throw new Error(te("homeworkNotFound"));

  const admin = createAdminClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${hw.tenant_id}/${hw.learner_id}/${crypto.randomUUID()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const up = await admin.storage.from("homework-files").upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
  if (up.error) throw new Error(up.error.message);

  await admin.from("homework_files").insert({ tenant_id: hw.tenant_id, manual_homework_id: hw.id, kind: "submission", file_path: path, file_name: file.name, mime_type: file.type || null, size_bytes: file.size, uploaded_by: user.id });
  await admin.from("manual_homework").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", hw.id);
  revalidatePath("/learn");
}
