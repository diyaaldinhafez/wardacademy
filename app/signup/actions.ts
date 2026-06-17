"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SignupState = { error?: string; message?: string };

/**
 * Self-serve guardian signup. Uses Supabase's public signUp (which carries
 * built-in rate limiting + optional captcha/email confirmation) instead of an
 * admin create, then provisions a guardian profile in the default tenant. If
 * the project requires email confirmation, the guardian confirms then signs in;
 * otherwise they're signed in immediately.
 */
export async function signupGuardian(_prev: SignupState | undefined, formData: FormData): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 8) {
    return { error: "Enter your name, email, and a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: /already|registered|exists/i.test(error.message) ? "That email is already registered." : error.message };
  }
  const userId = data.user?.id;
  if (!userId) return { error: "Sign up failed — please try again." };

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("is_default", true).single();
  if (!tenant) return { error: "Signups are not open yet." };

  const { error: pErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenant.id,
    full_name: name,
    roles: ["guardian"],
    login_email: email,
  });
  if (pErr && pErr.code !== "23505") return { error: pErr.message };

  if (data.session) redirect("/guardian"); // email confirmation disabled → already signed in
  return { message: "Account created. Please check your email to confirm, then sign in." };
}
