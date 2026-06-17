"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type EnrollState = { error?: string };

/**
 * One-shot enrolment: creates the guardian account, the child's prepared login,
 * the guardianship with consent, and (optionally) books a trial session — then
 * signs the guardian in. Done server-side (service role) so the whole journey
 * completes smoothly in one step. Placement happens later, after the session.
 */
export async function enroll(_prev: EnrollState | undefined, formData: FormData): Promise<EnrollState> {
  const gName = String(formData.get("gName") ?? "").trim();
  const gEmail = String(formData.get("gEmail") ?? "").trim().toLowerCase();
  const gPassword = String(formData.get("gPassword") ?? "");
  const cName = String(formData.get("cName") ?? "").trim();
  const cPassword = String(formData.get("cPassword") ?? "");
  const consent = formData.get("consent") === "on";
  const trialAt = String(formData.get("trialAt") ?? "");
  // honeypot (bots fill hidden fields)
  if (String(formData.get("company") ?? "")) return { error: "تعذّر إنشاء الحساب." };

  if (!gName || !gEmail || gPassword.length < 8) return { error: "أدخِل اسمك وبريدك وكلمة مرور لا تقلّ عن 8 أحرف." };
  if (!cName || cPassword.length < 6) return { error: "أدخِل اسم طفلك وكلمة مرور لا تقلّ عن 6 أحرف." };
  if (!consent) return { error: "الموافقة على مشاركة طفلك شرطٌ للمتابعة." };

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();
  if (!tenant) return { error: "التسجيل غير متاح حالياً." };

  // guardian
  const { data: g, error: ge } = await admin.auth.admin.createUser({ email: gEmail, password: gPassword, email_confirm: true });
  if (ge) return { error: /already|exists|registered/i.test(ge.message) ? "هذا البريد مسجَّلٌ مسبقاً." : ge.message };
  const guardianId = g.user.id;
  await admin.from("profiles").insert({ id: guardianId, tenant_id: tenant.id, full_name: gName, roles: ["guardian"], login_email: gEmail });

  // child (prepared login under a synthetic email)
  const slug = cName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "learner";
  const cEmail = `${slug}-${Math.random().toString(36).slice(2, 7)}@learner.ward.local`;
  const { data: ch, error: ce } = await admin.auth.admin.createUser({ email: cEmail, password: cPassword, email_confirm: true });
  if (ce) {
    await admin.auth.admin.deleteUser(guardianId); // roll back the guardian
    return { error: ce.message };
  }
  const learnerId = ch.user.id;
  await admin.from("profiles").insert({ id: learnerId, tenant_id: tenant.id, full_name: cName, roles: ["learner"], is_minor: true, login_email: cEmail });
  await admin.from("guardianships").insert({
    tenant_id: tenant.id,
    guardian_id: guardianId,
    learner_id: learnerId,
    relationship: "parent",
    consent_granted: true,
    consent_at: new Date().toISOString(),
  });

  // book the trial session with the tenant's instructor (best-effort)
  if (trialAt) {
    const { data: people } = await admin.from("profiles").select("id, roles").eq("tenant_id", tenant.id);
    const instructor = (people ?? []).find((p) => ((p.roles as string[]) ?? []).includes("instructor"));
    if (instructor) {
      try {
        await admin.from("sessions").insert({
          tenant_id: tenant.id,
          instructor_id: instructor.id,
          learner_id: learnerId,
          scheduled_at: trialAt,
          duration_minutes: 30,
          status: "scheduled",
        });
      } catch {
        // time taken / invalid — enrolment still succeeds; can rebook later
      }
    }
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: gEmail, password: gPassword });
  redirect("/guardian");
}
