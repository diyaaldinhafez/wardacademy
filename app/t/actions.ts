"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type TakeState = { error?: string; result?: { level: string; correct: number; total: number } };

const norm = (s: string) => s.trim().toLowerCase();

/**
 * A lead's student takes the placement test via the signed link. Access is by
 * the share token (no account); grading reads the hidden answers server-side.
 * The result is shown to the guardian and recorded for the teacher.
 */
export async function submitLeadTest(_prev: TakeState | undefined, formData: FormData): Promise<TakeState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "رابطٌ غير صالح." };

  const admin = createAdminClient();
  const { data: test } = await admin
    .from("lead_tests")
    .select("id, status, lead_id")
    .eq("share_token", token)
    .single();
  if (!test) return { error: "رابطٌ غير صالح أو منتهٍ." };
  if (test.status === "completed") return { error: "تمّ حلّ هذا الاختبار مسبقاً." };
  if (test.status !== "shared") return { error: "الاختبار غير متاحٍ بعد." };

  const { data: questions } = await admin
    .from("lead_test_questions")
    .select("id, level, answer")
    .eq("lead_test_id", test.id)
    .order("position");

  const byLevel = new Map<string, { total: number; correct: number }>();
  let correctCount = 0;
  for (const q of questions ?? []) {
    const raw = String(formData.get(`q_${q.id}`) ?? "");
    const correct = typeof q.answer === "string" && norm(raw) === norm(q.answer as string);
    if (correct) correctCount += 1;
    await admin.from("lead_test_questions").update({ response: { answer: raw }, is_correct: correct }).eq("id", q.id);
    const lvl = (q.level as string) ?? "A1";
    const s = byLevel.get(lvl) ?? { total: 0, correct: 0 };
    s.total += 1;
    if (correct) s.correct += 1;
    byLevel.set(lvl, s);
  }

  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  let suggested = "A1";
  for (const lvl of order) {
    const s = byLevel.get(lvl);
    if (s && s.correct >= Math.ceil(s.total / 2)) suggested = lvl;
  }

  await admin
    .from("lead_tests")
    .update({ status: "completed", suggested_level: suggested, completed_at: new Date().toISOString() })
    .eq("id", test.id);
  await admin.from("leads").update({ status: "tested" }).eq("id", test.lead_id);

  return { result: { level: suggested, correct: correctCount, total: (questions ?? []).length } };
}
