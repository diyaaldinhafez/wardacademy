import { redirect } from "next/navigation";

export const metadata = { title: "أنشئ حساب — أكاديمية وَرد", robots: { index: false } };

// The branded enrolment flow lives at /enroll.
export default function SignupPage() {
  redirect("/enroll");
}
