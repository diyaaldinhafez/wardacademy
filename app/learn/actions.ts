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
