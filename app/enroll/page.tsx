import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EnrollFlow from "@/components/enroll/EnrollFlow";

export const metadata: Metadata = {
  title: "أنشئ حساب طفلك — أكاديمية وَرد",
  robots: { index: false, follow: false },
};

export default async function EnrollPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/guardian");

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <EnrollFlow />
    </main>
  );
}
