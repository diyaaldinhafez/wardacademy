"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Self-serve guardian signup. Creates the account (auto-confirmed for v1), a
 * guardian profile in the default tenant, then signs them in. Done via the
 * service role so the profile + tenant wiring is server-controlled.
 */
export async function signupGuardian(_prev: { error?: string } | undefined, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 8) {
    return { error: "Enter your name, email, and a password of at least 8 characters." };
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();
  if (!tenant) return { error: "Signups are not open yet." };

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    return { error: /already|registered|exists/i.test(error.message) ? "That email is already registered." : error.message };
  }

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    tenant_id: tenant.id,
    full_name: name,
    roles: ["guardian"],
    login_email: email,
  });
  if (pErr) return { error: pErr.message };

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/guardian");
}
