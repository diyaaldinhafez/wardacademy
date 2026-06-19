import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard for admin/operations server actions. RLS alone is insufficient for
 * actions that use the service role (which bypasses RLS), so every such action
 * must verify the caller's role server-side here.
 */
export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, full_name, roles")
    .eq("id", user.id)
    .single();
  if (!profile || !((profile.roles as string[]) ?? []).includes("admin")) {
    throw new Error("هذا الإجراء للإدارة فقط.");
  }
  return { supabase, user, profile };
}

/** Guard for instructor (teacher) server actions. */
export async function assertInstructor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, full_name, roles")
    .eq("id", user.id)
    .single();
  if (!profile || !((profile.roles as string[]) ?? []).includes("instructor")) {
    throw new Error("هذا الإجراء للمعلّم فقط.");
  }
  return { supabase, user, profile };
}
