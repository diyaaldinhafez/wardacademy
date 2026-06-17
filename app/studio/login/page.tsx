import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homePathForRoles } from "@/lib/roles";
import LoginForm from "@/components/studio/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("roles").eq("id", user.id).single();
    redirect(homePathForRoles(profile?.roles));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Ward Academy</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Sign in</p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          New parent?{" "}
          <Link href="/signup" className="font-medium text-slate-900 underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
