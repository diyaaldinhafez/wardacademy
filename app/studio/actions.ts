"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateItem } from "@/lib/generation/service";
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
