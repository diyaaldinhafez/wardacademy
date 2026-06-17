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
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
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
