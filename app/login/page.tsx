import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Log in — Ward Academy",
  robots: { index: false, follow: false },
};

// The real login lives in the app. (Previously a visual mockup.)
export default function LoginPage() {
  redirect("/studio/login");
}
