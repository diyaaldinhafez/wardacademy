import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Placement test — Ward Academy",
  robots: { index: false, follow: false },
};

// Placement is run inside the app by the teacher; start with registration.
export default function PlacementPage() {
  redirect("/signup");
}
