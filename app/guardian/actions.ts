"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Guardian creates a child's prepared login (guardian-anchored, PRD §3). */
export async function addChild(formData: FormData) {
  const childName = String(formData.get("childName") ?? "").trim();
  const childPassword = String(formData.get("childPassword") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  if (!childName || childPassword.length < 6) {
    throw new Error("Enter the child's name and a password of at least 6 characters.");
  }

  const { data: gp } = await supabase.from("profiles").select("tenant_id, roles").eq("id", user.id).single();
  if (!gp || !(gp.roles as string[]).includes("guardian")) throw new Error("Only a guardian can add a child.");

  // Reasonable cap to limit account-creation abuse.
  const { count } = await supabase
    .from("guardianships")
    .select("*", { count: "exact", head: true })
    .eq("guardian_id", user.id);
  if ((count ?? 0) >= 10) throw new Error("Child limit reached.");

  const admin = createAdminClient();
  const slug = childName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "learner";
  const email = `${slug}-${Math.random().toString(36).slice(2, 7)}@learner.ward.local`;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: childPassword,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);

  const learnerId = created.user.id;
  const { error: pErr } = await admin.from("profiles").insert({
    id: learnerId,
    tenant_id: gp.tenant_id,
    full_name: childName,
    roles: ["learner"],
    is_minor: true,
    login_email: email,
  });
  if (pErr) throw new Error(pErr.message);

  const { error: gErr } = await admin.from("guardianships").insert({
    tenant_id: gp.tenant_id,
    guardian_id: user.id,
    learner_id: learnerId,
    relationship: "parent",
    consent_granted: false,
  });
  if (gErr) throw new Error(gErr.message);

  revalidatePath("/guardian");
}

/** Guardian grants consent for one of their children. */
export async function grantConsent(formData: FormData) {
  const learnerId = String(formData.get("learnerId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const admin = createAdminClient();
  const { error } = await admin
    .from("guardianships")
    .update({ consent_granted: true, consent_at: new Date().toISOString() })
    .eq("guardian_id", user.id)
    .eq("learner_id", learnerId);
  if (error) throw new Error(error.message);

  revalidatePath("/guardian");
}
