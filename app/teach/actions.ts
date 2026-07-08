"use server";

import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeacherApplyState = { error?: string; ok?: boolean };

const err = async (key: string) => (await getTranslations({ locale: "en", namespace: "teach.errors" }))(key);

/**
 * Public teacher application — creates a RECORD ONLY (teacher_applications, status 'applied').
 * §9(f) R1: NO auth user, NO profiles row, NO teacher_profiles row is created here — the instructor
 * account is minted solely by provisionTeacher on admin approval. Service-role insert (like submitLead).
 */
export async function submitTeacherApplication(_prev: TeacherApplyState | undefined, formData: FormData): Promise<TeacherApplyState> {
  if (String(formData.get("company") ?? "")) return { error: await err("failed") }; // honeypot

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const full_name = get("fullName");
  const email = get("email").toLowerCase();
  const phone = get("phone");
  const languages = get("languages");
  const specialties = get("specialties");
  const bio = get("bio");
  const note = get("note");

  if (!full_name || !email) return { error: await err("fillRequired") };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: await err("badEmail") };

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();
  if (!tenant) return { error: await err("closed") };

  const { error } = await admin.from("teacher_applications").insert({
    tenant_id: tenant.id,
    full_name,
    email,
    phone: phone || null,
    languages: languages || null,
    specialties: specialties || null,
    bio: bio || null,
    note: note || null,
    status: "applied",
  });
  if (error) return { error: await err("failed") };
  return { ok: true };
}
