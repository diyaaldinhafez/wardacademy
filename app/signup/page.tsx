import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "ar", namespace: "enrollForm" }); // PA-4: parent-facing → Arabic
  return { title: t("metaTitle"), robots: { index: false } };
}

// The branded enrolment flow lives at /enroll.
export default function SignupPage() {
  redirect("/enroll");
}
