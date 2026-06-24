"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { data: item } = await supabase.from("items").select("id, format").eq("id", itemId).single();
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
  const { data: a } = await supabase.from("assessments").select("id, status, learner_id").eq("id", assessmentId).single();
  if (!a || a.learner_id !== user.id || a.status !== "ready") throw new Error("الاختبار غير متاح.");

  const admin = createAdminClient();
  const { data: questions } = await admin.from("assessment_questions").select("id, skill, answer").eq("assessment_id", assessmentId).order("position");

  const bySkill = new Map<string, { correct: number; total: number }>();
  let correctTotal = 0;
  for (const q of questions ?? []) {
    const raw = String(formData.get(`q_${q.id}`) ?? "");
    const correct = typeof q.answer === "string" && norm(raw) === norm(q.answer as string);
    await admin.from("assessment_questions").update({ response: { answer: raw }, is_correct: correct }).eq("id", q.id);
    const s = bySkill.get(q.skill) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (correct) {
      s.correct += 1;
      correctTotal += 1;
    }
    bySkill.set(q.skill, s);
  }

  const total = (questions ?? []).length;
  const result = Object.fromEntries([...bySkill.entries()]);
  await admin
    .from("assessments")
    .update({ status: "completed", score: correctTotal, max_score: total, result, completed_at: new Date().toISOString() })
    .eq("id", assessmentId);

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
  if (!file || file.size === 0) throw new Error("ارفع صورة حلّك.");
  if (file.size > 25 * 1024 * 1024) throw new Error("حجم الصورة أكبر من 25 ميغابايت.");

  // RLS guarantees the learner only sees their own homework.
  const { data: hw } = await supabase.from("manual_homework").select("id, tenant_id, learner_id").eq("id", id).maybeSingle();
  if (!hw || hw.learner_id !== user.id) throw new Error("واجبٌ غير موجود.");

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
