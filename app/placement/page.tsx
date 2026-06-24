import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("placement");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Placement is run inside the app by the teacher; start with registration.
export default function PlacementPage() {
  redirect("/signup");
}
