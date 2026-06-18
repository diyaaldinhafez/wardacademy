"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email";
import { ENROLL_SKILLS } from "@/lib/enrollOptions";

type LeadState = { error?: string; leadId?: string };
type BookState = { error?: string; booked?: boolean; at?: string };

/** Public registration form — creates a LEAD (not an account). */
export async function submitLead(_prev: LeadState | undefined, formData: FormData): Promise<LeadState> {
  if (String(formData.get("company") ?? "")) return { error: "تعذّر الإرسال." }; // honeypot

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const guardian_name = get("guardianName");
  const guardian_email = get("guardianEmail").toLowerCase();
  const guardian_phone = get("guardianPhone");
  const guardian_country = get("guardianCountry");
  const guardian_nationality = get("guardianNationality");
  const guardian_relation = get("guardianRelation");
  const referral_source = get("referralSource");
  const consent = formData.get("consent") === "1";
  const student_name = get("studentName");
  const student_age = get("studentAge");
  const student_level = get("studentLevel"); // overall level code
  const school_type = get("schoolType");
  const learning_goal = get("learningGoal");
  const prior_study = get("priorStudy");
  const english_use = get("englishUse");
  const home_language = formData.getAll("homeLanguage").map(String).map((s) => s.trim()).filter(Boolean).join("، ");
  const student_notes = get("studentNotes");

  // Per-skill self-assessment → { listening, speaking, ... }.
  const skill_levels: Record<string, string> = {};
  for (const s of ENROLL_SKILLS) {
    const v = get(`skill_${s}`);
    if (v) skill_levels[s] = v;
  }

  if (!guardian_name || !guardian_email || !student_name) {
    return { error: "يرجى تعبئة اسمك وبريدك واسم الطفل." };
  }
  if (!consent) {
    return { error: "يرجى الموافقة على معالجة البيانات للمتابعة." };
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();
  if (!tenant) return { error: "التسجيل غير متاح حالياً." };

  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      tenant_id: tenant.id,
      book_token: crypto.randomUUID().replace(/-/g, ""),
      guardian_name,
      guardian_email,
      guardian_phone: guardian_phone || null,
      guardian_country: guardian_country || null,
      guardian_nationality: guardian_nationality || null,
      guardian_relation: guardian_relation || null,
      referral_source: referral_source || null,
      consent_accepted: consent,
      consent_at: consent ? new Date().toISOString() : null,
      student_name,
      student_age: student_age ? Number(student_age) : null,
      student_level: student_level || null,
      school_type: school_type || null,
      learning_goal: learning_goal || null,
      prior_study: prior_study || null,
      english_use: english_use || null,
      home_language: home_language || null,
      skill_levels: Object.keys(skill_levels).length ? skill_levels : null,
      student_notes: student_notes || null,
    })
    .select("id")
    .single();
  if (error || !lead) return { error: error?.message ?? "تعذّر الإرسال." };

  return { leadId: lead.id };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Atomically claim an open slot for a lead, mark the lead booked, and send the
// confirmation email (best-effort). Shared by the inline flow and the /book link.
async function claimAndConfirm(admin: any, leadId: string, slotId: string): Promise<BookState> {
  const { data: slot } = await admin.from("availability_slots").select("id, starts_at, status").eq("id", slotId).single();
  if (!slot || slot.status !== "open") return { error: "هذا الموعد لم يعد متاحاً — اختر غيره." };

  const { data: claimed, error } = await admin
    .from("availability_slots")
    .update({ status: "booked", lead_id: leadId })
    .eq("id", slotId)
    .eq("status", "open")
    .select("id");
  if (error || !claimed || claimed.length === 0) return { error: "حُجز هذا الموعد للتوّ — اختر غيره." };

  await admin.from("leads").update({ status: "booked" }).eq("id", leadId);

  try {
    const { data: lead } = await admin
      .from("leads")
      .select("tenant_id, guardian_name, guardian_email, student_name")
      .eq("id", leadId)
      .single();
    if (lead) {
      const { data: tenant } = await admin.from("tenants").select("timezone").eq("id", lead.tenant_id).single();
      await sendBookingConfirmation({
        to: lead.guardian_email,
        guardianName: lead.guardian_name,
        studentName: lead.student_name,
        whenUTC: slot.starts_at,
        timezone: tenant?.timezone ?? "Asia/Riyadh",
      });
    }
  } catch (e) {
    console.error("[booking] confirmation email failed:", e);
  }

  return { booked: true, at: slot.starts_at };
}

/** Book one of the teacher's open intro slots for this lead (inline flow). */
export async function bookSlot(_prev: BookState | undefined, formData: FormData): Promise<BookState> {
  const leadId = String(formData.get("leadId") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  if (!leadId || !slotId) return { error: "اختر موعداً متاحاً." };
  return claimAndConfirm(createAdminClient(), leadId, slotId);
}

/** Book via a lead's dedicated /book/<token> link (no account, no leadId). */
export async function bookSlotByToken(_prev: BookState | undefined, formData: FormData): Promise<BookState> {
  const token = String(formData.get("token") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  if (!token || !slotId) return { error: "اختر موعداً متاحاً." };
  const admin = createAdminClient();
  const { data: lead } = await admin.from("leads").select("id, status").eq("book_token", token).maybeSingle();
  if (!lead) return { error: "رابط الحجز غير صالح." };
  if (lead.status === "converted") return { error: "اكتمل تسجيلك بالفعل." };
  return claimAndConfirm(admin, lead.id, slotId);
}
