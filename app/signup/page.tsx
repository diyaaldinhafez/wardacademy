import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "@/components/SignupForm";

export const metadata = { title: "Ward Academy — Create account", robots: { index: false } };

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/guardian");

  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Create a parent account</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Sign up to add your child and follow their progress.</p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/studio/login" className="font-medium text-slate-900 underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
