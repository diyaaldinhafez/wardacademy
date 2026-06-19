"use server";

import { revalidatePath } from "next/cache";
import { assertInstructor } from "@/lib/auth";
import { expandSlots, type Rule } from "@/lib/availability";

/* eslint-disable @typescript-eslint/no-explicit-any */
const HORIZON_WEEKS = 4;
const RPATH = "/studio/availability";

/** Regenerate the teacher's own bookable slots from her rules (UPSERT + prune). */
export async function tRegenerate() {
  const { supabase, user, profile } = await assertInstructor();
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").eq("id", profile.tenant_id).maybeSingle();
  const timezone = tenant?.timezone ?? "Asia/Riyadh";
  const breakMinutes = tenant?.slot_break_minutes ?? 15;

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("id, instructor_id, weekday, start_time, end_time, slot_minutes")
    .eq("instructor_id", user.id)
    .eq("active", true);
  const { data: exceptions } = await supabase.from("availability_exceptions").select("on_date").eq("kind", "block");
  const exceptionDates = new Set<string>((exceptions ?? []).map((e: any) => e.on_date));

  const desired = expandSlots({ rules: (rules ?? []) as Rule[], exceptionDates, timezone, horizonWeeks: HORIZON_WEEKS, breakMinutes });

  if (desired.length) {
    const rows = desired.map((d) => ({
      tenant_id: profile.tenant_id,
      instructor_id: d.instructor_id,
      starts_at: d.starts_at,
      duration_minutes: d.duration_minutes,
      status: "open",
      source_rule_id: d.source_rule_id,
    }));
    const { error } = await supabase.from("availability_slots").upsert(rows, { onConflict: "instructor_id,starts_at", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  const desiredEpochs = new Set(desired.map((d) => Date.parse(d.starts_at)));
  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("availability_slots")
    .select("id, starts_at")
    .eq("instructor_id", user.id)
    .eq("status", "open")
    .not("source_rule_id", "is", null)
    .gte("starts_at", nowIso);
  const stale = (existing ?? []).filter((s: any) => !desiredEpochs.has(Date.parse(s.starts_at))).map((s: any) => s.id);
  if (stale.length) {
    const { error } = await supabase.from("availability_slots").delete().in("id", stale);
    if (error) throw new Error(error.message);
  }
  revalidatePath(RPATH);
}

export async function tAddRule(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);
  if (Number.isNaN(weekday) || !startTime || !endTime) throw new Error("أكمِل بيانات القاعدة.");
  if (endTime <= startTime) throw new Error("وقت النهاية يجب أن يكون بعد البداية.");
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
  await tRegenerate();
}

export async function tDeleteRule(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const { supabase, user } = await assertInstructor();
  await supabase.from("availability_slots").delete().eq("source_rule_id", id).eq("status", "open").gte("starts_at", new Date().toISOString());
  const { error } = await supabase.from("availability_rules").delete().eq("id", id).eq("instructor_id", user.id);
  if (error) throw new Error(error.message);
  await tRegenerate();
}

export async function tAddException(formData: FormData) {
  const onDate = String(formData.get("onDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!onDate) throw new Error("اختر تاريخاً.");
  const { supabase, profile } = await assertInstructor();
  const { error } = await supabase
    .from("availability_exceptions")
    .upsert({ tenant_id: profile.tenant_id, on_date: onDate, reason, kind: "block" }, { onConflict: "tenant_id,on_date" });
  if (error) throw new Error(error.message);
  await tRegenerate();
}

export async function tRemoveException(formData: FormData) {
  const id = String(formData.get("exceptionId") ?? "");
  const { supabase } = await assertInstructor();
  const { error } = await supabase.from("availability_exceptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await tRegenerate();
}

export async function tAddSlot(formData: FormData) {
  const startsAt = String(formData.get("startsAt") ?? "");
  const duration = Number(formData.get("duration") ?? 30);
  if (!startsAt) throw new Error("اختر وقتاً.");
  const { supabase, user, profile } = await assertInstructor();
  const { error } = await supabase.from("availability_slots").insert({
    tenant_id: profile.tenant_id,
    instructor_id: user.id,
    starts_at: startsAt,
    duration_minutes: duration,
    status: "open",
  });
  if (error) throw new Error(error.code === "23505" ? "هذا الوقت مُضافٌ مسبقاً." : error.message);
  revalidatePath(RPATH);
}

export async function tRemoveSlot(formData: FormData) {
  const id = String(formData.get("slotId") ?? "");
  const { supabase, user } = await assertInstructor();
  const { error } = await supabase.from("availability_slots").delete().eq("id", id).eq("instructor_id", user.id).eq("status", "open");
  if (error) throw new Error(error.message);
  revalidatePath(RPATH);
}
