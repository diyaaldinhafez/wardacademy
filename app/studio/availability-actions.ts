"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { assertInstructor } from "@/lib/auth";

const err = async (key: string) => (await getTranslations({ locale: "en", namespace: "studio.errors" }))(key);

// The teacher's availability defines when she teaches REGULAR lessons. It is read
// directly when scheduling a student's recurring sessions — it does NOT generate
// trial-booking slots (those are admin-owned; see app/admin/actions intro slots).

const RPATH = "/studio/availability";

export async function tAddRule(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);
  if (Number.isNaN(weekday) || !startTime || !endTime) throw new Error(await err("completeRuleData"));
  if (endTime <= startTime) throw new Error(await err("endAfterStart"));
  const { supabase, user, profile } = await assertInstructor();
  const { error } = await supabase.from("availability_rules").insert({
    tenant_id: profile.tenant_id,
    instructor_id: user.id,
    weekday,
    start_time: startTime,
    end_time: endTime,
    slot_minutes: slotMinutes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(RPATH);
}

export async function tDeleteRule(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const { supabase, user } = await assertInstructor();
  const { error } = await supabase.from("availability_rules").delete().eq("id", id).eq("instructor_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(RPATH);
}
