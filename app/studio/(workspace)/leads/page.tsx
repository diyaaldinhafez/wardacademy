import { createClient } from "@/lib/supabase/server";
import Onboarding from "@/app/studio/onboarding";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("roles").eq("id", user?.id ?? "").single();
  const isInstructor = ((profile?.roles as string[]) ?? []).includes("instructor");

  if (!isInstructor) {
    return <p style={{ fontSize: 14, color: "var(--text-muted)" }}>هذا القسم للمعلّم فقط.</p>;
  }

  return <Onboarding />;
}
