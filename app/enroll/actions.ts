"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type LeadState = { error?: string; leadId?: string };
type BookState = { error?: string; booked?: boolean; at?: string };

/** Public registration form — creates a LEAD (not an account). */
export async function submitLead(_prev: LeadState | undefined, formData: FormData): Promise<LeadState> {
  if (String(formData.get("company") ?? "")) return { error: "تعذّر الإرسال." }; // honeypot

  const guardian_name = String(formData.get("guardianName") ?? "").trim();
  const guardian_email = String(formData.get("guardianEmail") ?? "").trim().toLowerCase();
  const guardian_phone = String(formData.get("guardianPhone") ?? "").trim();
  const student_name = String(formData.get("studentName") ?? "").trim();
  const student_grade = String(formData.get("studentGrade") ?? "").trim();
  const student_level = String(formData.get("studentLevel") ?? "").trim();
  const student_notes = String(formData.get("studentNotes") ?? "").trim();

  if (!guardian_name || !guardian_email || !student_name) {
    return { error: "يرجى تعبئة اسمك وبريدك واسم الطفل." };
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();
  if (!tenant) return { error: "التسجيل غير متاح حالياً." };

  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      tenant_id: tenant.id,
      guardian_name,
      guardian_email,
      guardian_phone: guardian_phone || null,
      student_name,
      student_grade: student_grade || null,
      student_level: student_level || null,
      student_notes: student_notes || null,
    })
    .select("id")
    .single();
  if (error || !lead) return { error: error?.message ?? "تعذّر الإرسال." };

  return { leadId: lead.id };
}

/** Book one of the teacher's open intro slots for this lead. */
export async function bookSlot(_prev: BookState | undefined, formData: FormData): Promise<BookState> {
  const leadId = String(formData.get("leadId") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  if (!leadId || !slotId) return { error: "اختر موعداً متاحاً." };

  const admin = createAdminClient();
  const { data: slot } = await admin
    .from("availability_slots")
    .select("id, starts_at, status")
    .eq("id", slotId)
    .single();
  if (!slot || slot.status !== "open") return { error: "هذا الموعد لم يعد متاحاً — اختر غيره." };

  // atomic claim: only succeeds if still open
  const { data: claimed, error } = await admin
    .from("availability_slots")
    .update({ status: "booked", lead_id: leadId })
    .eq("id", slotId)
    .eq("status", "open")
    .select("id");
  if (error || !claimed || claimed.length === 0) return { error: "حُجز هذا الموعد للتوّ — اختر غيره." };

  await admin.from("leads").update({ status: "booked" }).eq("id", leadId);
  return { booked: true, at: slot.starts_at };
}
