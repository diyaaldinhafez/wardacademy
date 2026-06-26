"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
