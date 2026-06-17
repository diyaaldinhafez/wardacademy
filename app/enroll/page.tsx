import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Get started — Ward Academy",
  robots: { index: false, follow: false },
};

// "Get started / Book a free trial" now begins real registration.
export default function EnrollPage() {
  redirect("/signup");
}
